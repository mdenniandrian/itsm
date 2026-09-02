<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_key',
        'name',
        'description',
        'email_subject',
        'email_body',
        'telegram_template',
        'in_app_template',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Default template seed definitions
     */
    public static function getDefaultTemplates(): array
    {
        return [
            [
                'event_key' => 'ticket_created_requester',
                'name' => 'New Ticket Created (To Requester)',
                'description' => 'Confirmation email sent to the requester when a new ticket is submitted.',
                'email_subject' => '[ITSM #{ticket_number}] Your Ticket Has Been Created: {title}',
                'email_body' => "<p>Hello <strong>{requester_name}</strong>,</p>\n<p>Your support request has been received and queued in our ITSM system. Our technical team will review and attend to your issue shortly.</p>\n<p><strong>Ticket Summary:</strong></p>\n<ul>\n  <li><strong>Ticket Number:</strong> {ticket_number}</li>\n  <li><strong>Title:</strong> {title}</li>\n  <li><strong>Priority:</strong> {priority}</li>\n  <li><strong>Category:</strong> {category}</li>\n  <li><strong>SLA Target Resolution:</strong> {sla_due}</li>\n</ul>\n<p><strong>Description:</strong><br>{description}</p>",
                'telegram_template' => "🆕 <b>[NEW TICKET CREATED]</b>\n━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Ticket:</b> #{ticket_number}\n📌 <b>Title:</b> {title}\n👤 <b>Requester:</b> {requester_name} ({requester_email})\n⚡ <b>Priority:</b> {priority}\n🏷️ <b>Category:</b> {category}\n⏳ <b>SLA Target:</b> {sla_due}\n━━━━━━━━━━━━━━━━━━━━\n🔗 <a href=\"{portal_url}\">Open in ITSM Portal</a>",
                'in_app_template' => 'Ticket #{ticket_number} successfully created: {title}',
                'is_active' => true,
            ],
            [
                'event_key' => 'ticket_created_team',
                'name' => 'New Incoming Ticket Alert (To IT Team)',
                'description' => 'Notification broadcast to the IT Support team mailing list / group when a new ticket arrives.',
                'email_subject' => '🚨 [NEW TICKET] #{ticket_number} - {title}',
                'email_body' => "<p>Hello <strong>IT Support Team</strong>,</p>\n<p>A new ticket has been submitted by <strong>{requester_name}</strong> ({requester_email}) and is waiting for assignment and triage.</p>\n<p><strong>Ticket Details:</strong></p>\n<ul>\n  <li><strong>Ticket Number:</strong> {ticket_number}</li>\n  <li><strong>Title:</strong> {title}</li>\n  <li><strong>Priority:</strong> {priority}</li>\n  <li><strong>Category:</strong> {category}</li>\n  <li><strong>SLA Target:</strong> {sla_due}</li>\n</ul>\n<p><strong>Description:</strong><br>{description}</p>",
                'telegram_template' => "🚨 <b>[NEW TICKET IN QUEUE]</b>\n━━━━━━━━━━━━━━━━━━━━\n🆔 <b>ID:</b> #{ticket_number}\n📌 <b>Title:</b> {title}\n👤 <b>Requester:</b> {requester_name}\n⚡ <b>Priority:</b> {priority}\n🏷️ <b>Category:</b> {category}\n⏳ <b>SLA Target:</b> {sla_due}\n━━━━━━━━━━━━━━━━━━━━\n🔗 <a href=\"{portal_url}\">Assign & Handle Ticket</a>",
                'in_app_template' => 'New incoming ticket #{ticket_number} from {requester_name}',
                'is_active' => true,
            ],
            [
                'event_key' => 'ticket_assigned',
                'name' => 'Ticket Assignment (To Technician)',
                'description' => 'Notification dispatched to the technician when a ticket is assigned to them.',
                'email_subject' => '⚡ [Ticket Assignment] #{ticket_number} - {title}',
                'email_body' => "<p>Hello <strong>{assignee_name}</strong>,</p>\n<p>The following ticket has been assigned to you for investigation and resolution per SLA guidelines:</p>\n<ul>\n  <li><strong>Ticket Number:</strong> {ticket_number}</li>\n  <li><strong>Title:</strong> {title}</li>\n  <li><strong>Requester:</strong> {requester_name} ({requester_email})</li>\n  <li><strong>Priority:</strong> {priority}</li>\n  <li><strong>Target Resolution:</strong> {sla_due}</li>\n</ul>\n<p><strong>Problem Description:</strong><br>{description}</p>",
                'telegram_template' => "⚡ <b>[TICKET ASSIGNMENT]</b>\n━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Ticket:</b> #{ticket_number}\n📌 <b>Title:</b> {title}\n👨‍💻 <b>Assignee:</b> {assignee_name}\n👤 <b>Requester:</b> {requester_name}\n⚡ <b>Priority:</b> {priority}\n⏳ <b>Deadline:</b> {sla_due}\n━━━━━━━━━━━━━━━━━━━━\n🔗 <a href=\"{portal_url}\">View Ticket Now</a>",
                'in_app_template' => 'You have been assigned to ticket #{ticket_number}: {title}',
                'is_active' => true,
            ],
            [
                'event_key' => 'ticket_status_changed',
                'name' => 'Ticket Status Update (To Requester)',
                'description' => 'Notification sent to requester when ticket status is updated (e.g. Resolved, In Progress).',
                'email_subject' => '[ITSM #{ticket_number}] Status Updated: {status}',
                'email_body' => "<p>Hello <strong>{requester_name}</strong>,</p>\n<p>The status of your ticket <strong>#{ticket_number}: {title}</strong> has been updated to <strong>{status}</strong>.</p>\n<p>Please check the ITSM portal to view technician notes or respond.</p>",
                'telegram_template' => "🔄 <b>[TICKET STATUS UPDATED]</b>\n━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Ticket:</b> #{ticket_number}\n📌 <b>Title:</b> {title}\n📊 <b>New Status:</b> {status}\n👤 <b>Requester:</b> {requester_name}\n👨‍💻 <b>Technician:</b> {assignee_name}\n━━━━━━━━━━━━━━━━━━━━\n🔗 <a href=\"{portal_url}\">View Ticket Details</a>",
                'in_app_template' => 'Ticket #{ticket_number} status changed to {status}',
                'is_active' => true,
            ],
            [
                'event_key' => 'ticket_comment',
                'name' => 'New Comment & Discussion',
                'description' => 'Notification dispatched when a new comment or reply is posted on the ticket.',
                'email_subject' => '[ITSM #{ticket_number}] New Comment from {author_name}',
                'email_body' => "<p>Hello <strong>{recipient_name}</strong>,</p>\n<p><strong>{author_name}</strong> posted a new response on ticket <strong>#{ticket_number}: {title}</strong>:</p>\n<blockquote style=\"background:#f1f5f9;border-left:4px solid #3b82f6;padding:12px;margin:16px 0;font-style:normal;\">\n  {comment_text}\n</blockquote>\n<p>Please log in to the ITSM portal to reply or track progress.</p>",
                'telegram_template' => "💬 <b>[NEW COMMENT ON TICKET]</b>\n━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Ticket:</b> #{ticket_number} - {title}\n✍️ <b>From:</b> {author_name}\n📝 <b>Message:</b>\n<i>\"{comment_text}\"</i>\n━━━━━━━━━━━━━━━━━━━━\n🔗 <a href=\"{portal_url}\">Reply to Comment</a>",
                'in_app_template' => '{author_name} commented on ticket #{ticket_number}',
                'is_active' => true,
            ],
            [
                'event_key' => 'sla_breach_alert',
                'name' => 'SLA Breach Warning',
                'description' => 'Urgent escalation alert dispatched when a ticket exceeds target SLA resolution deadline.',
                'email_subject' => '⚠️ [SLA BREACH ALERT] #{ticket_number} Exceeded Target SLA!',
                'email_body' => "<p>Hello <strong>IT Support Team & Managers</strong>,</p>\n<p><strong style=\"color:#ef4444;\">WARNING:</strong> Ticket <strong>#{ticket_number}: {title}</strong> has exceeded its SLA resolution deadline.</p>\n<ul>\n  <li><strong>Ticket Number:</strong> {ticket_number}</li>\n  <li><strong>Priority:</strong> {priority}</li>\n  <li><strong>Technician:</strong> {assignee_name}</li>\n  <li><strong>Target Resolution:</strong> {sla_due}</li>\n</ul>\n<p>Please perform emergency escalation or investigation immediately.</p>",
                'telegram_template' => "⚠️ <b>[SLA BREACH ALERT]</b>\n━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Ticket:</b> #{ticket_number}\n📌 <b>Title:</b> {title}\n⚡ <b>Priority:</b> {priority}\n👨‍💻 <b>Technician:</b> {assignee_name}\n⏰ <b>SLA Target:</b> {sla_due}\n━━━━━━━━━━━━━━━━━━━━\n🚨 <b>Immediate Attention Required!</b>\n🔗 <a href=\"{portal_url}\">Escalate Ticket Now</a>",
                'in_app_template' => 'WARNING: Ticket #{ticket_number} SLA has breached!',
                'is_active' => true,
            ],
        ];
    }

    /**
     * Render template placeholders with data array
     */
    public static function render(string $template, array $data): string
    {
        $keys = array_map(fn($k) => '{' . $k . '}', array_keys($data));
        $values = array_values($data);
        return str_replace($keys, $values, $template);
    }
}
