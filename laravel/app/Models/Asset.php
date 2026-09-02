<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'brand',
        'model',
        'serial_number',
        'ip_address',
        'status',
        'assigned_to',
        'location',
        'purchase_value',
        'purchase_date',
        'warranty_expiry',
        'notes',
    ];

    protected $casts = [
        'purchase_value' => 'float',
        'purchase_date' => 'date',
        'warranty_expiry' => 'date',
    ];

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
