<?php

namespace Database\Seeders;

use App\Models\SlaPolicy;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Akun Tunggal Superadmin (Idempotent firstOrCreate)
        User::firstOrCreate(
            ['email' => 'admin@itsm.com'],
            [
                'name' => 'Super Administrator',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'department' => 'IT Department',
                'phone' => '+62 812-3456-7890',
                'is_active' => true,
            ]
        );

        // 2. SLA Policies Standar (Diperlukan untuk kalkulasi deadline tiket baru)
        SlaPolicy::firstOrCreate(
            ['priority' => 'critical'],
            [
                'name' => 'Critical Priority SLA',
                'response_hours' => 1,
                'resolution_hours' => 4,
                'is_active' => true,
            ]
        );

        SlaPolicy::firstOrCreate(
            ['priority' => 'high'],
            [
                'name' => 'High Priority SLA',
                'response_hours' => 2,
                'resolution_hours' => 8,
                'is_active' => true,
            ]
        );

        SlaPolicy::firstOrCreate(
            ['priority' => 'medium'],
            [
                'name' => 'Medium Priority SLA',
                'response_hours' => 4,
                'resolution_hours' => 24,
                'is_active' => true,
            ]
        );

        SlaPolicy::firstOrCreate(
            ['priority' => 'low'],
            [
                'name' => 'Low Priority SLA',
                'response_hours' => 8,
                'resolution_hours' => 72,
                'is_active' => true,
            ]
        );
    }
}
