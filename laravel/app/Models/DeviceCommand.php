<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeviceCommand extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_agent_id',
        'command_type',
        'payload',
        'status',
        'result',
        'sent_at',
        'completed_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function deviceAgent()
    {
        return $this->belongsTo(DeviceAgent::class);
    }
}
