<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeviceActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_agent_id',
        'app_name',
        'window_title',
        'started_at',
        'ended_at',
        'duration_seconds',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'duration_seconds' => 'integer',
    ];

    public function deviceAgent()
    {
        return $this->belongsTo(DeviceAgent::class);
    }
}
