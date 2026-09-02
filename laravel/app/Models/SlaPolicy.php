<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SlaPolicy extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'priority',
        'response_hours',
        'resolution_hours',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'response_hours' => 'integer',
        'resolution_hours' => 'integer',
    ];

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }
}
