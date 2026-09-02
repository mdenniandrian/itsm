<?php

namespace App\Services;

use App\Models\AddonConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    public static function sendTestMessage(string $botToken, string $chatId): array
    {
        if (empty($botToken) || empty($chatId)) {
            return [
                'success' => false,
                'message' => 'Bot Token and Chat ID are required for testing.',
            ];
        }

        $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
        $message = "🤖 <b>ITSM Notification Test</b>\n\n"
            . "✅ <i>Telegram Bot integration successfully configured!</i>\n"
            . "🕒 <b>Time:</b> " . now()->format('Y-m-d H:i:s') . "\n"
            . "🌐 <b>System:</b> IT Service Management Portal\n\n"
            . "New ticket notifications, SLA escalations, and incident status updates will be sent to this chat.";

        try {
            $response = Http::timeout(10)->post($url, [
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Test message sent successfully to Telegram!',
                    'data' => $response->json(),
                ];
            } else {
                $errorMsg = $response->json('description') ?: 'Failed to connect to Telegram API';
                return [
                    'success' => false,
                    'message' => "Telegram Error: {$errorMsg}",
                    'status_code' => $response->status(),
                ];
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to send message: ' . $e->getMessage(),
            ];
        }
    }

    public static function sendTicketNotification($ticket, string $eventType = 'created'): bool
    {
        $addon = AddonConfig::where('addon_key', 'telegram')->first();
        if (!$addon || !$addon->is_enabled) {
            return false;
        }

        $cfg = $addon->config ?: [];
        $botToken = $cfg['bot_token'] ?? '';
        $chatId = $cfg['chat_id'] ?? '';

        if (empty($botToken) || empty($chatId)) {
            return false;
        }

        // Check event toggle
        if ($eventType === 'created' && empty($cfg['notify_new_ticket'])) return false;
        if ($eventType === 'status_changed' && empty($cfg['notify_status_change'])) return false;
        if ($eventType === 'sla_breached' && empty($cfg['notify_sla_breach'])) return false;

        $eventKey = match ($eventType) {
            'created' => 'ticket_created_team',
            'status_changed' => 'ticket_status_changed',
            'sla_breached' => 'sla_breach_alert',
            default => 'ticket_created_team',
        };

        $tmpl = \App\Models\NotificationTemplate::where('event_key', $eventKey)->where('is_active', true)->first();

        $ticket->loadMissing(['requester', 'assignee']);

        $data = [
            'ticket_number' => $ticket->ticket_number,
            'title' => htmlspecialchars($ticket->title),
            'description' => htmlspecialchars($ticket->description ?? ''),
            'status' => strtoupper($ticket->status),
            'priority' => strtoupper($ticket->priority),
            'category' => ucwords(str_replace('_', ' ', $ticket->category)),
            'requester_name' => htmlspecialchars($ticket->requester?->name ?? 'User'),
            'requester_email' => htmlspecialchars($ticket->requester?->email ?? '-'),
            'assignee_name' => htmlspecialchars($ticket->assignee?->name ?? 'Unassigned'),
            'sla_due' => $ticket->sla_resolution_due ? $ticket->sla_resolution_due->format('d M Y H:i') : 'Per SLA',
            'comment_text' => '',
            'author_name' => '',
            'portal_url' => url('/#ticket-' . $ticket->id),
            'company_name' => 'ITSM Enterprise Helpdesk',
        ];

        if ($tmpl && !empty($tmpl->telegram_template)) {
            $message = \App\Models\NotificationTemplate::render($tmpl->telegram_template, $data);
        } else {
            $titlePrefix = match ($eventType) {
                'created' => '🆕 <b>[NEW TICKET]</b>',
                'status_changed' => '🔄 <b>[TICKET STATUS UPDATE]</b>',
                'sla_breached' => '⚠️ <b>[SLA BREACH ALERT]</b>',
                default => '🎫 <b>[TICKET NOTIFICATION]</b>',
            };

            $priorityIcon = match (strtolower($ticket->priority ?? 'medium')) {
                'critical' => '🔴 CRITICAL',
                'high' => '🟠 HIGH',
                'medium' => '🟡 MEDIUM',
                'low' => '🟢 LOW',
                default => '⚪ ' . strtoupper($ticket->priority ?? 'NORMAL'),
            };

            $message = "{$titlePrefix}\n"
                . "━━━━━━━━━━━━━━━━━━━━\n"
                . "🆔 <b>Ticket:</b> #{$ticket->ticket_number}\n"
                . "📌 <b>Title:</b> " . htmlspecialchars($ticket->title) . "\n"
                . "👤 <b>Requester:</b> " . htmlspecialchars($ticket->requester?->name ?? 'User') . "\n"
                . "🏷️ <b>Category:</b> " . htmlspecialchars(ucwords(str_replace('_', ' ', $ticket->category))) . "\n"
                . "⚡ <b>Priority:</b> {$priorityIcon}\n"
                . "📊 <b>Status:</b> " . strtoupper($ticket->status) . "\n"
                . "━━━━━━━━━━━━━━━━━━━━\n"
                . "🔗 <a href=\"" . url('/#ticket-' . $ticket->id) . "\">Open in ITSM Portal</a>";
        }

        try {
            $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
            Http::timeout(5)->post($url, [
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ]);
            return true;
        } catch (\Exception $e) {
            Log::warning('Failed to send telegram ticket notification: ' . $e->getMessage());
            return false;
        }
    }
}
