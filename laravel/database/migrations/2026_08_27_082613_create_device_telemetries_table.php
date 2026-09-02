<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('device_telemetries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_agent_id')->constrained('device_agents')->onDelete('cascade');
            $table->decimal('cpu_percent', 5, 2)->default(0);
            $table->decimal('ram_percent', 5, 2)->default(0);
            $table->decimal('disk_percent', 5, 2)->default(0);
            $table->integer('battery_percent')->nullable();
            $table->boolean('is_charging')->default(false);
            $table->boolean('is_idle')->default(false);
            $table->integer('idle_seconds')->default(0);
            $table->string('active_app')->nullable();
            $table->string('active_window')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_telemetries');
    }
};
