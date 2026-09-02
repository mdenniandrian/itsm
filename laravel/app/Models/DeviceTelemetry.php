<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeviceTelemetry extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_agent_id',
        'cpu_percent',
        'ram_percent',
        'disk_percent',
        'battery_percent',
        'is_charging',
        'is_idle',
        'idle_seconds',
        'active_app',
        'active_window',
    ];

    protected $casts = [
        'cpu_percent' => 'float',
        'ram_percent' => 'float',
        'disk_percent' => 'float',
        'is_charging' => 'boolean',
        'is_idle' => 'boolean',
        'idle_seconds' => 'integer',
    ];

    public function deviceAgent()
    {
        return $this->belongsTo(DeviceAgent::class);
    }
}
