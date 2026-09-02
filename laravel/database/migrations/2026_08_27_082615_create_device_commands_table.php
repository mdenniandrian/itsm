<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('device_commands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_agent_id')->constrained('device_agents')->onDelete('cascade');
            $table->string('command_type'); // message_popup, ping, system_info, restart_app
            $table->text('payload')->nullable(); // e.g. JSON with message content or instructions
            $table->string('status')->default('pending'); // pending, delivered, completed, failed
            $table->text('result')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_commands');
    }
};
