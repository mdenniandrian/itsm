<?php

namespace Database\Seeders;

use App\Models\NotificationTemplate;
use Illuminate\Database\Seeder;

class NotificationTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = NotificationTemplate::getDefaultTemplates();
        foreach ($defaults as $tmpl) {
            NotificationTemplate::updateOrCreate(
                ['event_key' => $tmpl['event_key']],
                $tmpl
            );
        }
    }
}
