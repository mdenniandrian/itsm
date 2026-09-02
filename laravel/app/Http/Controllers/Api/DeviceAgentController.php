<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceActivity;
use App\Models\DeviceAgent;
use App\Models\DeviceCommand;
use App\Models\DeviceTelemetry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DeviceAgentController extends Controller
{
    // ============================================
    // AGENT ENDPOINTS (Called by PC Agent Script)
    // ============================================

    public function register(Request $request)
    {
        $validated = $request->validate([
            'hostname' => 'required|string',
            'os_name' => 'required|string',
            'os_version' => 'nullable|string',
            'ip_address' => 'nullable|string',
            'mac_address' => 'nullable|string',
            'cpu_model' => 'nullable|string',
            'cpu_cores' => 'nullable|integer',
            'total_ram_gb' => 'nullable|numeric',
            'total_disk_gb' => 'nullable|numeric',
            'device_token' => 'nullable|string',
            'device_name' => 'nullable|string',
        ]);

        $token = $validated['device_token'] ?? null;
        $device = null;

        if ($token) {
            $device = DeviceAgent::where('device_token', $token)->first();
        }

        if (!$device && !empty($validated['mac_address'])) {
            $device = DeviceAgent::where('mac_address', $validated['mac_address'])->first();
        }

        if (!$device && !empty($validated['hostname'])) {
            $device = DeviceAgent::where('hostname', $validated['hostname'])
                ->where('os_name', $validated['os_name'])
                ->first();
        }

        if (!$device) {
            $token = $token ?: 'dev_' . Str::random(32);
            $device = DeviceAgent::create([
                'device_token' => $token,
                'device_name' => $validated['device_name'] ?? $validated['hostname'],
                'hostname' => $validated['hostname'],
                'os_name' => $validated['os_name'],
                'os_version' => $validated['os_version'] ?? null,
                'ip_address' => $validated['ip_address'] ?? $request->ip(),
                'public_ip' => $request->ip(),
                'mac_address' => $validated['mac_address'] ?? null,
                'cpu_model' => $validated['cpu_model'] ?? null,
                'cpu_cores' => $validated['cpu_cores'] ?? null,
                'total_ram_gb' => $validated['total_ram_gb'] ?? null,
                'total_disk_gb' => $validated['total_disk_gb'] ?? null,
                'status' => 'online',
                'last_seen_at' => now(),
            ]);
        } else {
            $device->update([
                'os_version' => $validated['os_version'] ?? $device->os_version,
                'ip_address' => $validated['ip_address'] ?? $device->ip_address,
                'public_ip' => $request->ip(),
                'cpu_model' => $validated['cpu_model'] ?? $device->cpu_model,
                'cpu_cores' => $validated['cpu_cores'] ?? $device->cpu_cores,
                'total_ram_gb' => $validated['total_ram_gb'] ?? $device->total_ram_gb,
                'total_disk_gb' => $validated['total_disk_gb'] ?? $device->total_disk_gb,
                'status' => 'online',
                'last_seen_at' => now(),
            ]);
        }

        return response()->json([
            'status' => 'registered',
            'device_id' => $device->id,
            'device_token' => $device->device_token,
            'heartbeat_interval_seconds' => 30,
        ]);
    }

    public function heartbeat(Request $request)
    {
        $token = $request->header('X-Device-Token') ?? $request->input('device_token');
        if (!$token) {
            return response()->json(['error' => 'Missing device token'], 401);
        }

        $device = DeviceAgent::where('device_token', $token)->first();
        if (!$device) {
            return response()->json(['error' => 'Device not found, please re-register'], 404);
        }

        $validated = $request->validate([
            'cpu_percent' => 'required|numeric',
            'ram_percent' => 'required|numeric',
            'disk_percent' => 'nullable|numeric',
            'battery_percent' => 'nullable|integer',
            'is_charging' => 'nullable|boolean',
            'is_idle' => 'nullable|boolean',
            'idle_seconds' => 'nullable|integer',
            'active_app' => 'nullable|string',
            'active_window' => 'nullable|string',
            'ip_address' => 'nullable|string',
            'cursor_x' => 'nullable|numeric',
            'cursor_y' => 'nullable|numeric',
            'cursor_x_pct' => 'nullable|numeric',
            'cursor_y_pct' => 'nullable|numeric',
            'screen_width' => 'nullable|integer',
            'screen_height' => 'nullable|integer',
        ]);

        $isIdle = (bool) ($validated['is_idle'] ?? false);
        $status = $isIdle ? 'idle' : 'online';

        // 1. Update Device Agent status
        $updateData = [
            'status' => $status,
            'current_app' => $validated['active_app'] ?? $device->current_app,
            'current_window_title' => $validated['active_window'] ?? $device->current_window_title,
            'current_cpu_percent' => $validated['cpu_percent'],
            'current_ram_percent' => $validated['ram_percent'],
            'current_disk_percent' => $validated['disk_percent'] ?? $device->current_disk_percent,
            'ip_address' => $validated['ip_address'] ?? $device->ip_address,
            'public_ip' => $request->ip(),
            'last_seen_at' => now(),
        ];

        if (isset($validated['cursor_x']))
            $updateData['cursor_x'] = round($validated['cursor_x']);
        if (isset($validated['cursor_y']))
            $updateData['cursor_y'] = round($validated['cursor_y']);
        if (isset($validated['cursor_x_pct']))
            $updateData['cursor_x_pct'] = $validated['cursor_x_pct'];
        if (isset($validated['cursor_y_pct']))
            $updateData['cursor_y_pct'] = $validated['cursor_y_pct'];
        if (isset($validated['screen_width']))
            $updateData['screen_width'] = $validated['screen_width'];
        if (isset($validated['screen_height']))
            $updateData['screen_height'] = $validated['screen_height'];

        $device->update($updateData);

        // 2. Insert Telemetry record
        DeviceTelemetry::create([
            'device_agent_id' => $device->id,
            'cpu_percent' => $validated['cpu_percent'],
            'ram_percent' => $validated['ram_percent'],
            'disk_percent' => $validated['disk_percent'] ?? 0,
            'battery_percent' => $validated['battery_percent'] ?? null,
            'is_charging' => (bool) ($validated['is_charging'] ?? false),
            'is_idle' => $isIdle,
            'idle_seconds' => (int) ($validated['idle_seconds'] ?? 0),
            'active_app' => $validated['active_app'] ?? null,
            'active_window' => $validated['active_window'] ?? null,
        ]);

        // 3. Track Activity changes (if app or window changed)
        if (!empty($validated['active_app'])) {
            $lastActivity = DeviceActivity::where('device_agent_id', $device->id)
                ->whereNull('ended_at')
                ->latest('started_at')
                ->first();

            if ($lastActivity && $lastActivity->app_name === $validated['active_app'] && $lastActivity->window_title === ($validated['active_window'] ?? '')) {
                // Same active window, update duration
                $duration = now()->diffInSeconds($lastActivity->started_at);
                $lastActivity->update(['duration_seconds' => $duration]);
            } else {
                // App or window changed: close previous activity and start new one
                if ($lastActivity) {
                    $duration = now()->diffInSeconds($lastActivity->started_at);
                    $lastActivity->update([
                        'ended_at' => now(),
                        'duration_seconds' => max(1, $duration),
                    ]);
                }

                DeviceActivity::create([
                    'device_agent_id' => $device->id,
                    'app_name' => $validated['active_app'],
                    'window_title' => $validated['active_window'] ?? null,
                    'started_at' => now(),
                    'duration_seconds' => 0,
                ]);
            }
        }

        // 4. Fetch pending remote commands for this device
        $pendingCommands = DeviceCommand::where('device_agent_id', $device->id)
            ->where('status', 'pending')
            ->get();

        $commandsToDeliver = [];
        foreach ($pendingCommands as $cmd) {
            $cmd->update([
                'status' => 'delivered',
                'sent_at' => now(),
            ]);
            $commandsToDeliver[] = [
                'command_id' => $cmd->id,
                'type' => $cmd->command_type,
                'payload' => json_decode($cmd->payload, true) ?: $cmd->payload,
            ];
        }

        return response()->json([
            'status' => 'ok',
            'commands' => $commandsToDeliver,
        ]);
    }

    public function uploadScreenshot(Request $request)
    {
        $token = $request->header('X-Device-Token') ?? $request->input('device_token');
        $device = DeviceAgent::where('device_token', $token)->first();
        if (!$device) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $dir = public_path('storage/screenshots');
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }

        $filename = "device_{$device->id}.jpg";
        $targetPath = "{$dir}/{$filename}";

        if ($request->hasFile('screenshot')) {
            $request->file('screenshot')->move($dir, $filename);
        } elseif ($request->filled('screenshot_base64')) {
            $base64 = $request->input('screenshot_base64');
            $base64 = preg_replace('#^data:image/\w+;base64,#i', '', $base64);
            $decoded = base64_decode($base64);
            if ($decoded !== false) {
                file_put_contents($targetPath, $decoded);
            }
        } elseif ($request->getContent()) {
            file_put_contents($targetPath, $request->getContent());
        }

        $url = "/storage/screenshots/{$filename}?t=" . time();
        $up = [
            'last_screenshot_path' => $url,
            'last_screenshot_at' => now(),
            'last_seen_at' => now(),
        ];

        if ($request->has('cursor_x'))
            $up['cursor_x'] = round($request->input('cursor_x'));
        if ($request->has('cursor_y'))
            $up['cursor_y'] = round($request->input('cursor_y'));
        if ($request->has('cursor_x_pct'))
            $up['cursor_x_pct'] = $request->input('cursor_x_pct');
        if ($request->has('cursor_y_pct'))
            $up['cursor_y_pct'] = $request->input('cursor_y_pct');
        if ($request->has('screen_width'))
            $up['screen_width'] = $request->input('screen_width');
        if ($request->has('screen_height'))
            $up['screen_height'] = $request->input('screen_height');
        if ($request->has('active_app'))
            $up['current_app'] = $request->input('active_app');
        if ($request->has('active_window'))
            $up['current_window_title'] = $request->input('active_window');

        $device->update($up);

        return response()->json([
            'status' => 'uploaded',
            'screenshot_url' => $url,
            'cursor_x_pct' => $device->cursor_x_pct,
            'cursor_y_pct' => $device->cursor_y_pct,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function commandResult(Request $request)
    {
        $token = $request->header('X-Device-Token') ?? $request->input('device_token');
        $device = DeviceAgent::where('device_token', $token)->first();
        if (!$device) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'command_id' => 'required|exists:device_commands,id',
            'status' => 'required|in:completed,failed',
            'result' => 'nullable|string',
        ]);

        $cmd = DeviceCommand::where('id', $validated['command_id'])
            ->where('device_agent_id', $device->id)
            ->first();

        if ($cmd) {
            $cmd->update([
                'status' => $validated['status'],
                'result' => $validated['result'] ?? null,
                'completed_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Command result recorded']);
    }

    // ============================================
    // WEB PORTAL ADMIN ENDPOINTS (Sanctum Auth)
    // ============================================

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'agent', 'superadmin'])) {
            return response()->json(['error' => 'Access denied: Device Monitoring endpoints are restricted to IT Staff & Administrators.'], 403);
        }

        $query = DeviceAgent::with('assignedUser');

        if ($request->filled('status')) {
            if ($request->status === 'online') {
                $query->where('last_seen_at', '>=', now()->subSeconds(90))->where('status', 'online');
            } elseif ($request->status === 'idle') {
                $query->where('last_seen_at', '>=', now()->subSeconds(90))->where('status', 'idle');
            } elseif ($request->status === 'offline') {
                $query->where(function ($q) {
                    $q->whereNull('last_seen_at')
                        ->orWhere('last_seen_at', '<', now()->subSeconds(90));
                });
            }
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('hostname', 'like', "%{$s}%")
                    ->orWhere('device_name', 'like', "%{$s}%")
                    ->orWhere('ip_address', 'like', "%{$s}%")
                    ->orWhere('current_app', 'like', "%{$s}%")
                    ->orWhereHas('assignedUser', fn($uq) => $uq->where('name', 'like', "%{$s}%"));
            });
        }

        $devices = $query->orderBy('last_seen_at', 'desc')->get()->map(function ($d) {
            $isOnline = $d->isOnline();
            $effectiveStatus = $isOnline ? $d->status : 'offline';

            return [
                'id' => $d->id,
                'device_token' => $d->device_token,
                'device_name' => $d->device_name ?: $d->hostname,
                'hostname' => $d->hostname,
                'os_name' => $d->os_name,
                'os_version' => $d->os_version,
                'ip_address' => $d->ip_address,
                'public_ip' => $d->public_ip,
                'mac_address' => $d->mac_address,
                'cpu_model' => $d->cpu_model,
                'cpu_cores' => $d->cpu_cores,
                'total_ram_gb' => $d->total_ram_gb,
                'total_disk_gb' => $d->total_disk_gb,
                'assigned_user_id' => $d->assigned_user_id,
                'assigned_user_name' => $d->assignedUser?->name,
                'assigned_user_email' => $d->assignedUser?->email,
                'assigned_user_dept' => $d->assignedUser?->department,
                'status' => $effectiveStatus,
                'current_app' => $d->current_app,
                'current_window_title' => $d->current_window_title,
                'last_screenshot_path' => $d->last_screenshot_path,
                'last_screenshot_at' => $d->last_screenshot_at?->toIso8601String(),
                'last_screenshot_diff' => $d->last_screenshot_at ? $d->last_screenshot_at->diffForHumans() : null,
                'cursor_x_pct' => $d->cursor_x_pct ?? 50.0,
                'cursor_y_pct' => $d->cursor_y_pct ?? 50.0,
                'cursor_x' => $d->cursor_x ?? 0,
                'cursor_y' => $d->cursor_y ?? 0,
                'screen_width' => $d->screen_width ?? 1920,
                'screen_height' => $d->screen_height ?? 1080,
                'current_cpu_percent' => $d->current_cpu_percent,
                'current_ram_percent' => $d->current_ram_percent,
                'current_disk_percent' => $d->current_disk_percent,
                'last_seen_at' => $d->last_seen_at?->toIso8601String(),
                'last_seen_diff' => $d->last_seen_at ? $d->last_seen_at->diffForHumans() : 'Never connected',
            ];
        });

        return response()->json([
            'devices' => $devices,
            'total' => $devices->count(),
        ]);
    }

    public function stats()
    {
        $all = DeviceAgent::all();
        $online = 0;
        $idle = 0;
        $offline = 0;
        $highCpu = 0;
        $highRam = 0;

        foreach ($all as $d) {
            if ($d->isOnline()) {
                if ($d->status === 'idle') {
                    $idle++;
                } else {
                    $online++;
                }
                if ($d->current_cpu_percent > 85)
                    $highCpu++;
                if ($d->current_ram_percent > 85)
                    $highRam++;
            } else {
                $offline++;
            }
        }

        return response()->json([
            'total_endpoints' => $all->count(),
            'online_count' => $online,
            'idle_count' => $idle,
            'offline_count' => $offline,
            'high_cpu_alerts' => $highCpu,
            'high_ram_alerts' => $highRam,
        ]);
    }

    public function show($id)
    {
        $d = DeviceAgent::with('assignedUser')->find($id);
        if (!$d) {
            return response()->json(['error' => 'Device not found'], 404);
        }

        // Recent Telemetry (last 30 samples)
        $telemetries = $d->telemetries()->take(30)->get()->map(function ($t) {
            return [
                'cpu' => $t->cpu_percent,
                'ram' => $t->ram_percent,
                'disk' => $t->disk_percent,
                'battery' => $t->battery_percent,
                'is_idle' => $t->is_idle,
                'app' => $t->active_app,
                'window' => $t->active_window,
                'time' => $t->created_at->format('H:i:s'),
            ];
        })->reverse()->values();

        // Recent Activities (App timeline)
        $activities = $d->activities()->take(20)->get()->map(function ($a) {
            return [
                'app_name' => $a->app_name,
                'window_title' => $a->window_title,
                'started_at' => $a->started_at->toIso8601String(),
                'ended_at' => $a->ended_at?->toIso8601String(),
                'duration_formatted' => $this->formatSecondsToReadable($a->duration_seconds),
                'duration_seconds' => $a->duration_seconds,
            ];
        });

        // Recent Commands
        $commands = $d->commands()->take(10)->get()->map(function ($c) {
            return [
                'id' => $c->id,
                'type' => $c->command_type,
                'payload' => $c->payload,
                'status' => $c->status,
                'result' => $c->result,
                'sent_at' => $c->sent_at?->toIso8601String(),
                'completed_at' => $c->completed_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'device' => [
                'id' => $d->id,
                'device_token' => $d->device_token,
                'device_name' => $d->device_name ?: $d->hostname,
                'hostname' => $d->hostname,
                'os_name' => $d->os_name,
                'os_version' => $d->os_version,
                'ip_address' => $d->ip_address,
                'public_ip' => $d->public_ip,
                'mac_address' => $d->mac_address,
                'cpu_model' => $d->cpu_model,
                'cpu_cores' => $d->cpu_cores,
                'total_ram_gb' => $d->total_ram_gb,
                'total_disk_gb' => $d->total_disk_gb,
                'assigned_user_id' => $d->assigned_user_id,
                'assigned_user_name' => $d->assignedUser?->name,
                'assigned_user_email' => $d->assignedUser?->email,
                'assigned_user_dept' => $d->assignedUser?->department,
                'status' => $d->isOnline() ? $d->status : 'offline',
                'current_app' => $d->current_app,
                'current_window_title' => $d->current_window_title,
                'last_screenshot_path' => $d->last_screenshot_path,
                'last_screenshot_at' => $d->last_screenshot_at?->toIso8601String(),
                'last_screenshot_diff' => $d->last_screenshot_at ? $d->last_screenshot_at->diffForHumans() : null,
                'cursor_x_pct' => $d->cursor_x_pct ?? 50.0,
                'cursor_y_pct' => $d->cursor_y_pct ?? 50.0,
                'cursor_x' => $d->cursor_x ?? 0,
                'cursor_y' => $d->cursor_y ?? 0,
                'screen_width' => $d->screen_width ?? 1920,
                'screen_height' => $d->screen_height ?? 1080,
                'current_cpu_percent' => $d->current_cpu_percent,
                'current_ram_percent' => $d->current_ram_percent,
                'current_disk_percent' => $d->current_disk_percent,
                'last_seen_at' => $d->last_seen_at?->toIso8601String(),
                'created_at' => $d->created_at->toIso8601String(),
            ],
            'telemetries' => $telemetries,
            'activities' => $activities,
            'commands' => $commands,
        ]);
    }

    public function liveFrame($id)
    {
        $d = DeviceAgent::find($id);
        if (!$d) {
            return response()->json(['error' => 'Device not found'], 404);
        }

        return response()->json([
            'id' => $d->id,
            'screenshot_url' => $d->last_screenshot_path,
            'cursor_x_pct' => (float) ($d->cursor_x_pct ?? 50.0),
            'cursor_y_pct' => (float) ($d->cursor_y_pct ?? 50.0),
            'cursor_x' => (int) ($d->cursor_x ?? 0),
            'cursor_y' => (int) ($d->cursor_y ?? 0),
            'screen_width' => (int) ($d->screen_width ?? 1920),
            'screen_height' => (int) ($d->screen_height ?? 1080),
            'current_app' => $d->current_app,
            'current_window_title' => $d->current_window_title,
            'current_cpu_percent' => $d->current_cpu_percent,
            'current_ram_percent' => $d->current_ram_percent,
            'status' => $d->isOnline() ? $d->status : 'offline',
            'last_screenshot_diff' => $d->last_screenshot_at ? $d->last_screenshot_at->diffForHumans() : 'Live',
            'timestamp' => now()->timestamp,
        ]);
    }

    public function captureScreen(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'agent', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $d = DeviceAgent::find($id);
        if (!$d) {
            return response()->json(['error' => 'Device not found'], 404);
        }

        $cmd = DeviceCommand::create([
            'device_agent_id' => $d->id,
            'command_type' => 'capture_screen',
            'payload' => json_encode(['timestamp' => now()->toIso8601String()]),
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Screen capture command sent to device',
            'command_id' => $cmd->id,
            'last_screenshot_path' => $d->last_screenshot_path,
            'last_screenshot_at' => $d->last_screenshot_at?->toIso8601String(),
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $d = DeviceAgent::find($id);
        if (!$d) {
            return response()->json(['error' => 'Device not found'], 404);
        }

        $validated = $request->validate([
            'device_name' => 'sometimes|string|max:255',
            'assigned_user_id' => 'nullable|exists:users,id',
        ]);

        $d->update($validated);

        return response()->json($d);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $d = DeviceAgent::find($id);
        if (!$d) {
            return response()->json(['error' => 'Device not found'], 404);
        }

        $d->delete();
        return response()->json(['message' => 'Device deleted successfully']);
    }

    public function sendCommand(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $d = DeviceAgent::find($id);
        if (!$d) {
            return response()->json(['error' => 'Device not found'], 404);
        }

        $validated = $request->validate([
            'command_type' => 'required|in:message_popup,ping,system_info,refresh',
            'message' => 'nullable|string',
            'title' => 'nullable|string',
        ]);

        $payload = json_encode([
            'title' => $validated['title'] ?? 'Notice from IT Support Team',
            'message' => $validated['message'] ?? 'Message from IT Service Management Administrator.',
            'timestamp' => now()->toIso8601String(),
        ]);

        $cmd = DeviceCommand::create([
            'device_agent_id' => $d->id,
            'command_type' => $validated['command_type'],
            'payload' => $payload,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Command successfully queued for device',
            'command_id' => $cmd->id,
        ]);
    }

    private function formatSecondsToReadable($seconds): string
    {
        if ($seconds < 60)
            return "{$seconds}s";
        $m = floor($seconds / 60);
        $s = $seconds % 60;
        if ($m < 60)
            return "{$m}m {$s}s";
        $h = floor($m / 60);
        $m = $m % 60;
        return "{$h}h {$m}m";
    }
}
