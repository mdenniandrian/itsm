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
}
