<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeviceAgent extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_token',
        'device_name',
        'hostname',
        'os_name',
        'os_version',
        'ip_address',
        'public_ip',
        'mac_address',
        'cpu_model',
        'cpu_cores',
        'total_ram_gb',
        'total_disk_gb',
        'assigned_user_id',
        'status',
        'current_app',
        'current_window_title',
        'last_screenshot_path',
        'last_screenshot_at',
        'cursor_x_pct',
        'cursor_y_pct',
        'cursor_x',
        'cursor_y',
        'screen_width',
        'screen_height',
        'is_streaming',
        'current_cpu_percent',
        'current_ram_percent',
        'current_disk_percent',
        'last_seen_at',
    ];

    protected $casts = [
        'total_ram_gb' => 'float',
        'total_disk_gb' => 'float',
        'cursor_x_pct' => 'float',
        'cursor_y_pct' => 'float',
        'cursor_x' => 'integer',
        'cursor_y' => 'integer',
        'screen_width' => 'integer',
        'screen_height' => 'integer',
        'is_streaming' => 'boolean',
        'current_cpu_percent' => 'float',
        'current_ram_percent' => 'float',
        'current_disk_percent' => 'float',
        'last_screenshot_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function telemetries()
    {
        return $this->hasMany(DeviceTelemetry::class)->orderBy('created_at', 'desc');
    }

    public function activities()
    {
        return $this->hasMany(DeviceActivity::class)->orderBy('started_at', 'desc');
    }

    public function commands()
    {
        return $this->hasMany(DeviceCommand::class)->orderBy('created_at', 'desc');
    }

    public function isOnline(): bool
    {
        if (!$this->last_seen_at) return false;
        // Consider device online if heartbeat received in last 90 seconds
        return $this->last_seen_at->gt(now()->subSeconds(90));
    }
}
