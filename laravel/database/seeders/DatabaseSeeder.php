<?php

namespace Database\Seeders;

use App\Models\SlaPolicy;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Akun Tunggal Superadmin (Idempotent firstOrCreate)
        User::firstOrCreate(
            ['email' => 'admin@itsm.com'],
            [
                'name' => 'Super Administrator',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'department' => 'IT Department',
                'phone' => '+62 812-3456-7890',
                'is_active' => true,
            ]
        );

        // 2. SLA Policies Standar (Diperlukan untuk kalkulasi deadline tiket baru)
        SlaPolicy::firstOrCreate(
            ['priority' => 'critical'],
            [
                'name' => 'Critical Priority SLA',
                'response_hours' => 1,
                'resolution_hours' => 4,
                'is_active' => true,
            ]
        );

        SlaPolicy::firstOrCreate(
            ['priority' => 'high'],
            [
                'name' => 'High Priority SLA',
                'response_hours' => 2,
                'resolution_hours' => 8,
                'is_active' => true,
            ]
        );

        SlaPolicy::firstOrCreate(
            ['priority' => 'medium'],
            [
                'name' => 'Medium Priority SLA',
                'response_hours' => 4,
                'resolution_hours' => 24,
                'is_active' => true,
            ]
        );

        SlaPolicy::firstOrCreate(
            ['priority' => 'low'],
            [
                'name' => 'Low Priority SLA',
                'response_hours' => 8,
                'resolution_hours' => 72,
                'is_active' => true,
            ]
        );

        // 3. Add-ons & Integrations Default Configs
        \App\Models\AddonConfig::firstOrCreate(
            ['addon_key' => 'telegram'],
            [
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
            ]
        );

        \App\Models\AddonConfig::firstOrCreate(
            ['addon_key' => 'ldap'],
            [
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
            ]
        );

        \App\Models\AddonConfig::firstOrCreate(
            ['addon_key' => 'smtp'],
            [
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
            ]
        );

        \App\Models\AddonConfig::firstOrCreate(
            ['addon_key' => 'slack'],
            [
                'name' => 'Slack Incoming Webhook',
                'description' => 'Push rich ticket cards and incident escalation notifications to Slack channels via incoming webhook.',
                'category' => 'notification',
                'is_enabled' => false,
                'config' => [
                    'webhook_url' => '',
                    'channel' => '#it-support',
                    'username' => 'ITSM Bot',
                ],
            ]
        );

        \App\Models\AddonConfig::firstOrCreate(
            ['addon_key' => 'webhook'],
            [
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
            ]
        );

        \App\Models\AddonConfig::firstOrCreate(
            ['addon_key' => 'branding'],
            [
                'name' => 'Company Profile & Theme Customizer',
                'description' => 'Customize company profile identity, app name, logo, favicon, version, copyright, and color themes.',
                'category' => 'integration',
                'is_enabled' => true,
                'config' => [
                    'app_name' => 'ITSM Enterprise',
                    'company_name' => 'PT Bangden Digital Solusindo',
                    'theme_primary' => '#6366f1',
                ],
            ]
        );
    }
}
