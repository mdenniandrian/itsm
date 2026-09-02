<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AddonConfig;
use App\Services\LdapService;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AddonController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Only Administrators can access add-ons & integrations configuration.'], 403);
        }

        $this->ensureDefaults();

        $addons = AddonConfig::orderBy('category')->orderBy('name')->get();
        return response()->json([
            'addons' => $addons,
            'total' => $addons->count(),
        ]);
    }

    public function show(Request $request, $key)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $addon = AddonConfig::where('addon_key', $key)->first();
        if (!$addon) {
            return response()->json(['error' => 'Add-on not found'], 404);
        }
        return response()->json($addon);
    }

    public function update(Request $request, $key)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Only Administrators can modify add-on configuration.'], 403);
        }

        $addon = AddonConfig::where('addon_key', $key)->first();
        if (!$addon) {
            return response()->json(['error' => 'Add-on not found'], 404);
        }

        $validated = $request->validate([
            'is_enabled' => 'required|boolean',
            'config' => 'required|array',
        ]);

        $addon->update([
            'is_enabled' => $validated['is_enabled'],
            'config' => $validated['config'],
        ]);

        return response()->json([
            'message' => "Configuration for {$addon->name} saved successfully.",
            'addon' => $addon,
        ]);
    }

    public function test(Request $request, $key)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Only Administrators can test add-on connections.'], 403);
        }

        $addon = AddonConfig::where('addon_key', $key)->first();
        if (!$addon) {
            return response()->json(['error' => 'Add-on not found'], 404);
        }

        // Allow overriding config from request body for instant testing before saving
        $config = $request->input('config') ?: $addon->config ?: [];
        $result = ['success' => false, 'message' => 'Unsupported test type'];

        switch ($key) {
            case 'telegram':
                $botToken = $config['bot_token'] ?? '';
                $chatId = $config['chat_id'] ?? '';
                $result = TelegramService::sendTestMessage($botToken, $chatId);
                break;

            case 'ldap':
                $result = LdapService::testConnection($config);
                break;

            case 'smtp':
                $customTarget = $request->input('test_recipient');
                $recipientEmail = (!empty($customTarget) && filter_var($customTarget, FILTER_VALIDATE_EMAIL))
                    ? $customTarget
                    : ((!empty($config['from_address']) && !str_ends_with($config['from_address'], '@itsm.com'))
                        ? $config['from_address']
                        : ((!empty($config['username']) && filter_var($config['username'], FILTER_VALIDATE_EMAIL) && !str_ends_with($config['username'], '@itsm.com'))
                            ? $config['username']
                            : (($user->email && !str_ends_with($user->email, '@itsm.com'))
                                ? $user->email
                                : 'no-reply@bangden.my.id')));

                $result = \App\Services\EmailNotificationService::sendTestEmail($recipientEmail, $config);
                break;

            case 'webhook':
            case 'slack':
                $url = $config['webhook_url'] ?? '';
                if (empty($url)) {
                    $result = ['success' => false, 'message' => 'Webhook URL is required.'];
                } else {
                    try {
                        $payload = [
                            'event' => 'test_ping',
                            'message' => 'ITSM Webhook connection test payload',
                            'timestamp' => now()->toIso8601String(),
                            'source' => 'ITSM Portal Backoffice',
                        ];
                        $resp = Http::timeout(6)->post($url, $payload);
                        if ($resp->successful()) {
                            $result = [
                                'success' => true,
                                'message' => "Webhook connection test succeeded! (HTTP {$resp->status()})",
                            ];
                        } else {
                            $result = [
                                'success' => false,
                                'message' => "Webhook endpoint responded with HTTP status {$resp->status()}",
                            ];
                        }
                    } catch (\Exception $e) {
                        $result = [
                            'success' => false,
                            'message' => 'Failed to send webhook payload: ' . $e->getMessage(),
                        ];
                    }
                }
                break;
        }

        // Record test status to database
        $status = $result['success'] ? 'success' : 'failed';
        $addon->update([
            'last_tested_at' => now(),
            'last_test_status' => $status,
            'last_test_message' => $result['message'],
        ]);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
            'status' => $status,
            'tested_at' => now()->toIso8601String(),
            'addon' => $addon,
        ]);
    }

    private function ensureDefaults(): void
    {
        $defaults = [
            [
                'addon_key' => 'telegram',
                'name' => 'Telegram Bot Alerts',
                'description' => 'Instant real-time ticket alerts, SLA breach warnings, and technician dispatch via Telegram groups or channels.',
                'category' => 'notification',
                'is_enabled' => !empty(env('TELEGRAM_BOT_TOKEN')),
                'config' => [
                    'bot_token' => env('TELEGRAM_BOT_TOKEN', ''),
                    'chat_id' => env('TELEGRAM_CHAT_ID', ''),
                    'notify_new_ticket' => true,
                    'notify_status_change' => true,
                    'notify_sla_breach' => true,
                    'notify_new_comment' => true,
                ],
            ],
            [
                'addon_key' => 'ldap',
                'name' => 'Zimbra LDAP & Active Directory SSO',
                'description' => 'Enterprise Single Sign-On (SSO) authentication with Zimbra Mail Server or Microsoft Active Directory directory service.',
                'category' => 'authentication',
                'is_enabled' => filter_var(env('LDAP_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
                'config' => [
                    'host' => env('LDAP_HOST', 'mail.bangden.my.id'),
                    'port' => (int)env('LDAP_PORT', 389),
                    'base_dn' => env('LDAP_BASE_DN', 'ou=people,dc=bangden,dc=my,dc=id'),
                    'admin_user' => env('LDAP_ADMIN_USER', ''),
                    'admin_password' => env('LDAP_ADMIN_PASSWORD', ''),
                    'use_ssl' => filter_var(env('LDAP_USE_SSL', false), FILTER_VALIDATE_BOOLEAN),
                    'use_tls' => filter_var(env('LDAP_USE_TLS', false), FILTER_VALIDATE_BOOLEAN),
                    'default_role' => 'user',
                ],
            ],
            [
                'addon_key' => 'smtp',
                'name' => 'SMTP Email Gateway',
                'description' => 'Automated email notifications for ticket confirmation, technician assignment, SLA alerts, and resolution survey.',
                'category' => 'notification',
                'is_enabled' => true,
                'config' => [
                    'host' => env('MAIL_HOST', 'smtp.gmail.com'),
                    'port' => (int)env('MAIL_PORT', 587),
                    'username' => env('MAIL_USERNAME', ''),
                    'password' => env('MAIL_PASSWORD', ''),
                    'encryption' => env('MAIL_ENCRYPTION', 'tls'),
                    'from_address' => env('MAIL_FROM_ADDRESS', 'helpdesk@company.com'),
                    'from_name' => env('MAIL_FROM_NAME', 'ITSM Helpdesk'),
                ],
            ],
            [
                'addon_key' => 'slack',
                'name' => 'Slack Incoming Webhook',
                'description' => 'Push rich ticket cards and incident escalation notifications to Slack channels via incoming webhook.',
                'category' => 'notification',
                'is_enabled' => false,
                'config' => [
                    'webhook_url' => '',
                    'channel' => '#it-support',
                    'username' => 'ITSM Bot',
                ],
            ],
            [
                'addon_key' => 'webhook',
                'name' => 'Outbound Event Webhooks',
                'description' => 'Send HTTP POST JSON payloads to external endpoints, SIEM, or third-party APIs upon ticket lifecycle events.',
                'category' => 'integration',
                'is_enabled' => false,
                'config' => [
                    'endpoint_url' => '',
                    'secret_token' => '',
                    'event_ticket_created' => true,
                    'event_ticket_resolved' => true,
                ],
            ],
            [
                'addon_key' => 'branding',
                'name' => 'Company Profile & Theme Customizer',
                'description' => 'Customize company profile identity, app name, logo, favicon, version, copyright, and color themes.',
                'category' => 'integration',
                'is_enabled' => true,
                'config' => [
                    'app_name' => 'ITSM Enterprise',
                    'company_name' => 'PT Bangden Digital Solusindo',
                    'theme_primary' => '#6366f1',
                ],
            ],
        ];

        foreach ($defaults as $def) {
            AddonConfig::firstOrCreate(
                ['addon_key' => $def['addon_key']],
                $def
            );
        }
    }
}
