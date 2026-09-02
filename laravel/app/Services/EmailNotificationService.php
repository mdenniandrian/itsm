<?php

namespace App\Services;

use App\Models\AddonConfig;
use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

class EmailNotificationService
{
    /**
     * Send email using configured SMTP Add-on
     */
    public static function sendEmail(string $toEmail, string $subject, string $htmlBody, array $overrideConfig = []): array
    {
        if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'message' => "Invalid destination email address: {$toEmail}",
            ];
        }

        $config = $overrideConfig;
        if (empty($config)) {
            $addon = AddonConfig::where('addon_key', 'smtp')->first();
            if (!$addon || !$addon->is_enabled) {
                return [
                    'success' => false,
                    'message' => 'SMTP Email Gateway integration is disabled.',
                ];
            }
            $config = $addon->config ?: [];
        }

        $host = trim($config['host'] ?? '127.0.0.1');
        // Strip accidental protocol prefixes (e.g. smtp://, ssl://, tls://)
        $host = preg_replace('#^(smtp|ssl|tls|https?)://#i', '', $host);
        $host = explode(':', $host)[0]; // strip port if pasted as host:port

        // Auto resolve known host if DNS resolution fails
        if ($host === 'mail.bangden.my.id' && gethostbyname($host) === $host) {
            $host = '157.20.254.135';
        }

        $port = (int) ($config['port'] ?? 587);
        $encryption = strtolower($config['encryption'] ?? 'tls');
        $username = $config['username'] ?? '';
        $password = $config['password'] ?? '';
        $fromAddress = $config['from_address'] ?? 'no-reply@bangden.my.id';
        $fromName = $config['from_name'] ?? 'ITSM Enterprise Service Desk';

        if (empty($host)) {
            return [
                'success' => false,
                'message' => 'SMTP Host has not been configured.',
            ];
        }

        try {
            $isTls = in_array($encryption, ['tls', 'starttls']) || $port === 587;
            $isSsl = $encryption === 'ssl' || $port === 465;

            $transport = new EsmtpTransport($host, $port, $isSsl);
            $stream = $transport->getStream();
            
            // Set 12-second timeout (sufficient for TLS handshake & cloud VPS network)
            $stream->setTimeout(12);

            // Allow self-signed or internal CA SSL certificates (for custom Zimbra/Postfix mail servers)
            if (method_exists($stream, 'setStreamOptions')) {
                $stream->setStreamOptions([
                    'ssl' => [
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                        'allow_self_signed' => true,
                    ],
                ]);
            }

            if ($isTls) {
                $transport->setAutoTls(true);
            }

            if (!empty($username)) {
                $transport->setUsername($username);
                $transport->setPassword($password);
            }

            $mailer = new Mailer($transport);

            $email = (new Email())
                ->from(new Address($fromAddress, $fromName))
                ->to(new Address($toEmail))
                ->subject($subject)
                ->html($htmlBody);

            $mailer->send($email);

            return [
                'success' => true,
                'message' => "Email sent successfully to {$toEmail} via SMTP {$host}:{$port}",
            ];
        } catch (\Exception $e) {
            $err = $e->getMessage();
            Log::error("SMTP Mail Send Error to {$toEmail}: " . $err);

            $detailed = $err;
            if (stripos($err, 'timed out') !== false || stripos($err, 'timeout') !== false) {
                if ($port === 25) {
                    $detailed = "Connection timed out on port 25. Port 25 is blocked by default on most VPS providers (DigitalOcean, AWS, Linode, etc.). Please switch to port 587 (TLS) or port 465 (SSL).";
                } else {
                    $detailed = "Connection to SMTP server '{$host}:{$port}' timed out after 12s. Please check if your VPS firewall allows outbound traffic to {$host}:{$port}, or verify the host address and port.";
                }
            } elseif (stripos($err, '535') !== false || stripos($err, 'authentication failed') !== false || stripos($err, 'bad credentials') !== false) {
                $detailed = "SMTP Authentication failed for user '{$username}'. Please verify your credentials. If using Gmail / Google Workspace, please generate and use an App Password (Sandi Aplikasi).";
            } elseif (stripos($err, 'Connection refused') !== false) {
                $detailed = "Connection refused on {$host}:{$port}. No mail server is listening on this port or it is blocked by an external firewall.";
            }

            return [
                'success' => false,
                'message' => $detailed,
            ];
        }
    }

    /**
     * Send test verification email
     */
    public static function sendTestEmail(string $recipientEmail, array $config = []): array
    {
        $subject = "🧪 [ITSM Test] SMTP Email Gateway Verification";
        $html = self::buildHtmlTemplate(
            title: "SMTP Email Gateway Configuration Test",
            badge: "TEST CONNECTION",
            badgeColor: "#6366f1",
            content: "
                <p>Hello Administrator,</p>
                <p>This is a confirmation message that the <strong>SMTP Email Gateway</strong> integration on <strong>ITSM Enterprise</strong> portal is configured properly and active.</p>
                <div style='background:#f8fafc;padding:14px;border-radius:8px;margin:16px 0;border:1px solid #e2e8f0;font-size:13px;'>
                    <div style='margin-bottom:4px;'><strong>SMTP Server:</strong> " . htmlspecialchars($config['host'] ?? 'Configured Host') . ":" . htmlspecialchars($config['port'] ?? '587') . "</div>
                    <div style='margin-bottom:4px;'><strong>Encryption:</strong> " . strtoupper($config['encryption'] ?? 'TLS') . "</div>
                    <div style='margin-bottom:4px;'><strong>Sender Address (From):</strong> " . htmlspecialchars($config['from_address'] ?? 'no-reply@bangden.my.id') . "</div>
                    <div style='margin-bottom:4px;'><strong>Recipient Test Target:</strong> " . htmlspecialchars($recipientEmail) . "</div>
                    <div><strong>Sent At:</strong> " . now()->format('d M Y H:i:s') . "</div>
                </div>
                <p>Notifications for new tickets, technician assignments, status updates, and comments will be delivered automatically through this gateway per your configured rules.</p>
            "
        );

        return self::sendEmail($recipientEmail, $subject, $html, $config);
    }

    /**
     * Send notification when a ticket is created
     */
    public static function sendTicketCreated(Ticket $ticket): void
    {
        $addon = AddonConfig::where('addon_key', 'smtp')->first();
        if (!$addon || !$addon->is_enabled) {
            return;
        }

        $cfg = $addon->config ?: [];
        $ticket->loadMissing(['requester', 'assignee', 'slaPolicy']);

        // Check rule: Notify Requester
        $notifyRequester = $cfg['notify_new_ticket_requester'] ?? true;
        if ($notifyRequester && $ticket->requester && filter_var($ticket->requester->email, FILTER_VALIDATE_EMAIL)) {
            $data = self::prepareTicketData($ticket, [
                'recipient_name' => $ticket->requester->name,
            ]);

            $tmpl = \App\Models\NotificationTemplate::where('event_key', 'ticket_created_requester')->where('is_active', true)->first();
            if ($tmpl) {
                $subject = \App\Models\NotificationTemplate::render($tmpl->email_subject, $data);
                $content = \App\Models\NotificationTemplate::render($tmpl->email_body, $data);
                $html = self::buildHtmlTemplate("Your New Support Ticket Has Been Received", "NEW", "#6366f1", $content);
            } else {
                $subject = "[ITSM #{$ticket->ticket_number}] Ticket Created Successfully: {$ticket->title}";
                $html = self::buildTicketTemplate(
                    ticket: $ticket,
                    headerTitle: "Your New Support Ticket Has Been Received",
                    introText: "Hello <strong>" . htmlspecialchars($ticket->requester->name) . "</strong>, your ticket has been submitted to our ITSM queue. Our technical team will attend to your request shortly.",
                    badgeText: "NEW",
                    badgeColor: "#6366f1"
                );
            }
            self::sendEmail($ticket->requester->email, $subject, $html);
        }

        // Check rule: Notify Assignee (if directly assigned)
        $notifyAssigned = $cfg['notify_assigned'] ?? true;
        if ($ticket->assignee && filter_var($ticket->assignee->email, FILTER_VALIDATE_EMAIL)) {
            if ($notifyAssigned) {
                self::sendTicketAssigned($ticket, $ticket->assignee);
            }
        } else {
            // If NOT assigned yet, check rule: Notify IT Team / Helpdesk Group
            $notifyTeam = $cfg['notify_new_ticket_team'] ?? true;
            if ($notifyTeam) {
                $teamEmail = $cfg['team_email'] ?? '';
                $routingMode = $cfg['routing_mode'] ?? 'both';

                $data = self::prepareTicketData($ticket, [
                    'recipient_name' => 'IT Support Team',
                ]);

                $tmpl = \App\Models\NotificationTemplate::where('event_key', 'ticket_created_team')->where('is_active', true)->first();
                if ($tmpl) {
                    $subject = \App\Models\NotificationTemplate::render($tmpl->email_subject, $data);
                    $content = \App\Models\NotificationTemplate::render($tmpl->email_body, $data);
                    $html = self::buildHtmlTemplate("New Ticket in Helpdesk Queue", "QUEUE", "#ef4444", $content);
                } else {
                    $subject = "🚨 [NEW INCOMING TICKET] #{$ticket->ticket_number} - {$ticket->title}";
                    $html = self::buildTicketTemplate(
                        ticket: $ticket,
                        headerTitle: "New Ticket in Helpdesk Queue",
                        introText: "Hello <strong>IT Support Team</strong>, a new ticket has been submitted by <strong>" . htmlspecialchars($ticket->requester?->name ?? 'User') . "</strong> and is awaiting triage.",
                        badgeText: "QUEUE",
                        badgeColor: "#ef4444"
                    );
                }

                $sentToGroup = false;
                if (!empty($teamEmail) && filter_var($teamEmail, FILTER_VALIDATE_EMAIL) && in_array($routingMode, ['group_only', 'both'])) {
                    self::sendEmail($teamEmail, $subject, $html);
                    $sentToGroup = true;
                }

                if (!$sentToGroup || in_array($routingMode, ['broadcast_all', 'both'])) {
                    $itStaff = User::whereIn('role', ['admin', 'agent', 'manager'])
                        ->where('is_active', true)
                        ->where('id', '!=', $ticket->requester_id)
                        ->get();

                    foreach ($itStaff as $staff) {
                        if (filter_var($staff->email, FILTER_VALIDATE_EMAIL) && !str_ends_with($staff->email, '@itsm.com')) {
                            self::sendEmail($staff->email, $subject, $html);
                        }
                    }
                }
            }
        }
    }

    /**
     * Send notification when a ticket is assigned to an agent
     */
    public static function sendTicketAssigned(Ticket $ticket, User $assignee): void
    {
        $addon = AddonConfig::where('addon_key', 'smtp')->first();
        if (!$addon || !$addon->is_enabled) {
            return;
        }

        $cfg = $addon->config ?: [];
        if (!($cfg['notify_assigned'] ?? true)) {
            return;
        }

        if (!filter_var($assignee->email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $data = self::prepareTicketData($ticket, [
            'recipient_name' => $assignee->name,
            'assignee_name' => $assignee->name,
        ]);

        $tmpl = \App\Models\NotificationTemplate::where('event_key', 'ticket_assigned')->where('is_active', true)->first();
        if ($tmpl) {
            $subject = \App\Models\NotificationTemplate::render($tmpl->email_subject, $data);
            $content = \App\Models\NotificationTemplate::render($tmpl->email_body, $data);
            $html = self::buildHtmlTemplate("New Ticket Assigned to You", "ASSIGNED", "#f59e0b", $content);
        } else {
            $subject = "⚡ [Ticket Assignment] #{$ticket->ticket_number} - {$ticket->title}";
            $html = self::buildTicketTemplate(
                ticket: $ticket,
                headerTitle: "New Ticket Assigned to You",
                introText: "Hello <strong>" . htmlspecialchars($assignee->name) . "</strong>, the following ticket has been assigned to you for investigation per SLA standards.",
                badgeText: "ASSIGNED",
                badgeColor: "#f59e0b"
            );
        }

        self::sendEmail($assignee->email, $subject, $html);
    }

    /**
     * Send notification when a ticket status changes
     */
    public static function sendTicketStatusChanged(Ticket $ticket, string $oldStatus, string $newStatus): void
    {
        $addon = AddonConfig::where('addon_key', 'smtp')->first();
        if (!$addon || !$addon->is_enabled) {
            return;
        }

        $cfg = $addon->config ?: [];
        if (!($cfg['notify_status_change'] ?? true)) {
            return;
        }

        $ticket->loadMissing(['requester', 'assignee']);

        if (!$ticket->requester || !filter_var($ticket->requester->email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $statusLabels = [
            'open' => 'Open',
            'in_progress' => 'In Progress',
            'pending' => 'Pending',
            'resolved' => 'Resolved',
            'closed' => 'Closed',
        ];

        $statusColors = [
            'open' => '#6366f1',
            'in_progress' => '#3b82f6',
            'pending' => '#f59e0b',
            'resolved' => '#10b981',
            'closed' => '#64748b',
        ];

        $oldLabel = $statusLabels[$oldStatus] ?? strtoupper($oldStatus);
        $newLabel = $statusLabels[$newStatus] ?? strtoupper($newStatus);
        $badgeColor = $statusColors[$newStatus] ?? '#6366f1';

        $data = self::prepareTicketData($ticket, [
            'recipient_name' => $ticket->requester->name,
            'status' => $newLabel,
        ]);

        $tmpl = \App\Models\NotificationTemplate::where('event_key', 'ticket_status_changed')->where('is_active', true)->first();
        if ($tmpl) {
            $subject = \App\Models\NotificationTemplate::render($tmpl->email_subject, $data);
            $content = \App\Models\NotificationTemplate::render($tmpl->email_body, $data);
            $html = self::buildHtmlTemplate("Ticket Status Update", strtoupper($newStatus), $badgeColor, $content);
        } else {
            $subject = "[ITSM #{$ticket->ticket_number}] Status Updated: {$newLabel}";
            $html = self::buildTicketTemplate(
                ticket: $ticket,
                headerTitle: "Ticket Status Update",
                introText: "Hello <strong>" . htmlspecialchars($ticket->requester->name) . "</strong>, the status of your ticket has been updated from <strong>{$oldLabel}</strong> to <span style='color:{$badgeColor};font-weight:bold;'>{$newLabel}</span>.",
                badgeText: strtoupper($newStatus),
                badgeColor: $badgeColor
            );
        }

        self::sendEmail($ticket->requester->email, $subject, $html);
    }

    /**
     * Send notification when a comment is added
     */
    public static function sendTicketComment(Ticket $ticket, TicketComment $comment, User $author): void
    {
        $addon = AddonConfig::where('addon_key', 'smtp')->first();
        if (!$addon || !$addon->is_enabled) {
            return;
        }

        $cfg = $addon->config ?: [];
        if (!($cfg['notify_comment'] ?? true)) {
            return;
        }

        $ticket->loadMissing(['requester', 'assignee']);

        // Don't send external email for internal notes
        if ($comment->is_internal) {
            return;
        }

        // Determine recipient
        $recipient = null;
        if ($author->id === $ticket->requester_id) {
            $recipient = $ticket->assignee;
        } else {
            $recipient = $ticket->requester;
        }

        if (!$recipient || !filter_var($recipient->email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $data = self::prepareTicketData($ticket, [
            'recipient_name' => $recipient->name,
            'author_name' => $author->name,
            'comment_text' => htmlspecialchars($comment->content),
        ]);

        $tmpl = \App\Models\NotificationTemplate::where('event_key', 'ticket_comment')->where('is_active', true)->first();
        if ($tmpl) {
            $subject = \App\Models\NotificationTemplate::render($tmpl->email_subject, $data);
            $content = \App\Models\NotificationTemplate::render($tmpl->email_body, $data);
            $html = self::buildHtmlTemplate("New Message / Comment on Ticket", "COMMENT", "#3b82f6", $content);
        } else {
            $subject = "[ITSM #{$ticket->ticket_number}] New Comment from {$author->name}";
            $html = self::buildHtmlTemplate(
                title: "New Message / Comment on Ticket",
                badge: "COMMENT",
                badgeColor: "#3b82f6",
                content: "
                    <p>Hello <strong>" . htmlspecialchars($recipient->name) . "</strong>,</p>
                    <p><strong>" . htmlspecialchars($author->name) . "</strong> posted a new comment on ticket <strong>#{$ticket->ticket_number}: " . htmlspecialchars($ticket->title) . "</strong>:</p>
                    <div style='background:#f1f5f9;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;margin:16px 0;font-size:14px;line-height:1.6;'>
                        " . nl2br(htmlspecialchars($comment->content)) . "
                    </div>
                    <p style='color:#64748b;font-size:12px;'>Please log in to the ITSM portal to reply or track progress.</p>
                "
            );
        }

        self::sendEmail($recipient->email, $subject, $html);
    }

    /**
     * Prepare data dictionary for template placeholders
     */
    private static function prepareTicketData(Ticket $ticket, array $extras = []): array
    {
        return array_merge([
            'ticket_number' => $ticket->ticket_number,
            'title' => $ticket->title,
            'description' => $ticket->description,
            'status' => strtoupper($ticket->status),
            'priority' => strtoupper($ticket->priority),
            'category' => ucwords(str_replace('_', ' ', $ticket->category)),
            'requester_name' => $ticket->requester?->name ?? 'User',
            'requester_email' => $ticket->requester?->email ?? '-',
            'assignee_name' => $ticket->assignee?->name ?? 'Unassigned',
            'sla_due' => $ticket->sla_resolution_due ? $ticket->sla_resolution_due->format('d M Y H:i') : 'Standard SLA',
            'comment_text' => '',
            'author_name' => '',
            'recipient_name' => 'User',
            'portal_url' => url('/#ticket-' . $ticket->id),
            'company_name' => 'ITSM Enterprise Helpdesk',
        ], $extras);
    }

    /**
     * Helper: Build standard Ticket HTML email template
     */
    private static function buildTicketTemplate(Ticket $ticket, string $headerTitle, string $introText, string $badgeText, string $badgeColor): string
    {
        $priorityColors = [
            'critical' => '#ef4444',
            'high' => '#f97316',
            'medium' => '#f59e0b',
            'low' => '#10b981',
        ];
        $pColor = $priorityColors[$ticket->priority] ?? '#6366f1';

        $content = "
            <p>{$introText}</p>
            <div style='background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:16px;margin:20px 0;'>
                <table style='width:100%;border-collapse:collapse;font-size:13px;'>
                    <tr>
                        <td style='padding:6px 0;color:#64748b;width:130px;'>Ticket Number:</td>
                        <td style='padding:6px 0;font-weight:bold;color:#0f172a;font-family:monospace;'>{$ticket->ticket_number}</td>
                    </tr>
                    <tr>
                        <td style='padding:6px 0;color:#64748b;'>Title:</td>
                        <td style='padding:6px 0;font-weight:600;color:#0f172a;'>" . htmlspecialchars($ticket->title) . "</td>
                    </tr>
                    <tr>
                        <td style='padding:6px 0;color:#64748b;'>Category:</td>
                        <td style='padding:6px 0;color:#334155;'>" . htmlspecialchars(ucwords(str_replace('_', ' ', $ticket->category))) . "</td>
                    </tr>
                    <tr>
                        <td style='padding:6px 0;color:#64748b;'>Priority:</td>
                        <td style='padding:6px 0;'><span style='background:{$pColor};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;'>" . strtoupper($ticket->priority) . "</span></td>
                    </tr>
                    <tr>
                        <td style='padding:6px 0;color:#64748b;'>Status:</td>
                        <td style='padding:6px 0;font-weight:600;color:#0f172a;'>" . strtoupper($ticket->status) . "</td>
                    </tr>
                    " . ($ticket->sla_resolution_due ? "
                    <tr>
                        <td style='padding:6px 0;color:#64748b;'>SLA Resolution Target:</td>
                        <td style='padding:6px 0;color:#ef4444;font-weight:500;'>" . $ticket->sla_resolution_due->format('d M Y H:i') . "</td>
                    </tr>
                    " : "") . "
                </table>
                <div style='margin-top:14px;padding-top:12px;border-top:1px dashed #cbd5e1;'>
                    <div style='font-size:12px;color:#64748b;margin-bottom:4px;font-weight:600;'>Problem Description:</div>
                    <div style='font-size:13px;color:#334155;line-height:1.5;background:white;padding:10px;border-radius:4px;border:1px solid #e2e8f0;'>" . nl2br(htmlspecialchars($ticket->description)) . "</div>
                </div>
            </div>
        ";

        return self::buildHtmlTemplate($headerTitle, $badgeText, $badgeColor, $content);
    }

    /**
     * Send Account Welcome & Verification Email to newly registered user
     */
    public static function sendUserWelcomeVerificationEmail(User $user, ?string $rawPassword = null): array
    {
        $appName = config('app.name', 'ITSM Enterprise');
        $portalUrl = url('/');

        $data = [
            'app_name' => $appName,
            'portal_url' => $portalUrl,
            'user_name' => $user->name,
            'user_email' => $user->email,
            'user_role' => strtoupper($user->role),
            'department' => $user->department ?: 'General Department',
            'temporary_password' => $rawPassword ?: '(Your chosen secure password)',
        ];

        $subject = "🎉 Welcome to {$appName} - Account Registration & Login Details";
        $content = "
            <p>Hello <strong>" . htmlspecialchars($user->name) . "</strong>,</p>
            <p>Your user account has been successfully created and verified on the <strong>{$appName}</strong> Service Desk portal.</p>
            <div style='background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:16px;margin:20px 0;'>
                <div style='font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px;'>🔐 Your Account Login Details:</div>
                <table style='width:100%;border-collapse:collapse;font-size:13px;'>
                    <tr>
                        <td style='padding:6px 0;color:#64748b;width:140px;'>Login Email:</td>
                        <td style='padding:6px 0;font-weight:bold;color:#0f172a;'>" . htmlspecialchars($user->email) . "</td>
                    </tr>
                    <tr>
                        <td style='padding:6px 0;color:#64748b;'>Password:</td>
                        <td style='padding:6px 0;font-family:monospace;font-weight:600;color:#4338ca;background:rgba(99,102,241,0.08);padding-left:6px;border-radius:4px;'>" . htmlspecialchars($data['temporary_password']) . "</td>
                    </tr>
                    <tr>
                        <td style='padding:6px 0;color:#64748b;'>Assigned Role:</td>
                        <td style='padding:6px 0;'><span style='background:#6366f1;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;'>" . strtoupper($user->role) . "</span></td>
                    </tr>
                    <tr>
                        <td style='padding:6px 0;color:#64748b;'>Department:</td>
                        <td style='padding:6px 0;color:#334155;'>" . htmlspecialchars($data['department']) . "</td>
                    </tr>
                </table>
            </div>
            <p style='margin-top:20px;text-align:center;'>
                <a href='{$portalUrl}' style='background:linear-gradient(135deg,#6366f1 0%,#4338ca 100%);color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;box-shadow:0 4px 12px rgba(99,102,241,0.3);'>Login to ITSM Portal</a>
            </p>
            <p style='font-size:12px;color:#64748b;margin-top:24px;'>
                🔒 <strong>Security Notice:</strong> Please log in and change your password after your first login via <em>Account Settings</em>.
            </p>
        ";

        $tmpl = \App\Models\NotificationTemplate::where('event_key', 'user_welcome_verification')->where('is_active', true)->first();
        if ($tmpl) {
            $subject = \App\Models\NotificationTemplate::render($tmpl->email_subject, $data);
            $renderedBody = \App\Models\NotificationTemplate::render($tmpl->email_body, $data);
            $htmlBody = self::buildHtmlTemplate("Welcome to {$appName}", "ACCOUNT VERIFIED", "#10b981", $renderedBody);
        } else {
            $htmlBody = self::buildHtmlTemplate("Welcome to {$appName}", "ACCOUNT VERIFIED", "#10b981", $content);
        }

        return self::sendEmail($user->email, $subject, $htmlBody);
    }

    /**
     * Helper: Base HTML Email Container
     */
    private static function buildHtmlTemplate(string $title, string $badge, string $badgeColor, string $content): string
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        </head>
        <body style='margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;color:#1e293b;'>
            <table width='100%' cellpadding='0' cellspacing='0' style='background-color:#0b0f19;padding:30px 15px;'>
                <tr>
                    <td align='center'>
                        <table width='100%' style='max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.3);'>
                            <!-- Header -->
                            <tr>
                                <td style='background:linear-gradient(135deg,#6366f1 0%,#4338ca 100%);padding:24px 30px;color:white;'>
                                    <table width='100%'>
                                        <tr>
                                            <td>
                                                <div style='font-size:18px;font-weight:800;letter-spacing:-0.5px;'>ITSM ENTERPRISE</div>
                                                <div style='font-size:12px;opacity:0.85;margin-top:2px;'>Service Desk & Incident Notification</div>
                                            </td>
                                            <td align='right'>
                                                <span style='background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:6px;font-size:11px;font-weight:bold;letter-spacing:0.5px;'>{$badge}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- Title Bar -->
                            <tr>
                                <td style='padding:24px 30px 0 30px;'>
                                    <h2 style='margin:0;color:#0f172a;font-size:18px;font-weight:700;'>{$title}</h2>
                                </td>
                            </tr>
                            <!-- Main Body -->
                            <tr>
                                <td style='padding:16px 30px 24px 30px;font-size:14px;line-height:1.6;color:#334155;'>
                                    {$content}
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style='background:#f8fafc;padding:18px 30px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;'>
                                    This message was sent automatically by <strong>ITSM Enterprise Helpdesk Portal</strong>.<br>
                                    Please do not reply directly to this automated email address.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        ";
    }
}
