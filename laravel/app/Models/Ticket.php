<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'title',
        'description',
        'status',
        'priority',
        'category',
        'requester_id',
        'assignee_id',
        'sla_policy_id',
        'sla_response_due',
        'sla_resolution_due',
        'sla_response_breached',
        'sla_resolution_breached',
        'first_response_at',
        'resolved_at',
        'closed_at',
        'problem_id',
        'service_catalog_id',
        'satisfaction_rating',
        'satisfaction_feedback',
        'rated_at',
    ];

    protected $casts = [
        'sla_response_breached' => 'boolean',
        'sla_resolution_breached' => 'boolean',
        'sla_response_due' => 'datetime',
        'sla_resolution_due' => 'datetime',
        'first_response_at' => 'datetime',
        'resolved_at' => 'datetime',
        'closed_at' => 'datetime',
        'rated_at' => 'datetime',
        'satisfaction_rating' => 'integer',
    ];

    public function problem()
    {
        return $this->belongsTo(Problem::class, 'problem_id');
    }

    public function serviceCatalog()
    {
        return $this->belongsTo(ServiceCatalogItem::class, 'service_catalog_id');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function slaPolicy()
    {
        return $this->belongsTo(SlaPolicy::class, 'sla_policy_id');
    }

    public function comments()
    {
        return $this->hasMany(TicketComment::class)->orderBy('created_at', 'asc');
    }

    public function history()
    {
        return $this->hasMany(TicketHistory::class)->orderBy('created_at', 'desc');
    }
}
