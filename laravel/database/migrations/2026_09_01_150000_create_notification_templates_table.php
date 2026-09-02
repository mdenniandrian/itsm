<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            $table->string('event_key')->unique(); // ticket_created_requester, ticket_created_team, ticket_assigned, ticket_status_changed, ticket_comment, sla_breach_alert
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('email_subject');
            $table->text('email_body');
            $table->text('telegram_template');
            $table->text('in_app_template');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_templates');
    }
};
