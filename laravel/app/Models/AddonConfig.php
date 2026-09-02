<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AddonConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'addon_key',
        'name',
        'description',
        'icon',
        'category',
        'is_enabled',
        'config',
        'last_tested_at',
        'last_test_status',
        'last_test_message',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'config' => 'array',
        'last_tested_at' => 'datetime',
    ];

    public static function isEnabled(string $key): bool
    {
        return (bool) static::where('addon_key', $key)->value('is_enabled');
    }

    public static function getConfig(string $key, $default = [])
    {
        $addon = static::where('addon_key', $key)->first();
        if (!$addon || !$addon->config) {
            return $default;
        }
        return $addon->config;
    }
}
