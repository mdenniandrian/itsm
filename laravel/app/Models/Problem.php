<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Problem extends Model
{
    use HasFactory;

    protected $fillable = [
        'problem_number',
        'title',
        'description',
        'status',
        'priority',
        'impact',
        'root_cause',
        'workaround',
        'permanent_solution',
        'owner_id',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'problem_id');
    }
}
