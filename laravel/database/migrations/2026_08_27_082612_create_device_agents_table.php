<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('device_agents', function (Blueprint $table) {
            $table->id();
            $table->string('device_token')->unique();
            $table->string('device_name')->nullable();
            $table->string('hostname');
            $table->string('os_name'); // Windows, macOS, Linux
            $table->string('os_version')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('public_ip')->nullable();
            $table->string('mac_address')->nullable();
            $table->string('cpu_model')->nullable();
            $table->integer('cpu_cores')->nullable();
            $table->decimal('total_ram_gb', 8, 2)->nullable();
            $table->decimal('total_disk_gb', 8, 2)->nullable();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('status')->default('offline'); // online, idle, offline
            $table->string('current_app')->nullable(); // e.g. Google Chrome, Visual Studio Code
            $table->string('current_window_title')->nullable(); // e.g. ITSM Portal - Dashboard
            $table->decimal('current_cpu_percent', 5, 2)->default(0);
            $table->decimal('current_ram_percent', 5, 2)->default(0);
            $table->decimal('current_disk_percent', 5, 2)->default(0);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_agents');
    }
};
