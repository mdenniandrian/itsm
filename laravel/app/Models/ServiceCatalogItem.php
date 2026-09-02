<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceCatalogItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'description',
        'icon',
        'estimated_delivery_hours',
        'requires_approval',
        'is_active',
        'form_fields',
    ];

    protected $casts = [
        'requires_approval' => 'boolean',
        'is_active' => 'boolean',
        'form_fields' => 'array',
    ];

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'service_catalog_id');
    }
}
