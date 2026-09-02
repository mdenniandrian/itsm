<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeArticle;
use Illuminate\Http\Request;

class KnowledgeController extends Controller
{
    public function index(Request $request)
    {
        $query = KnowledgeArticle::with('author')->where('status', 'published');

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('content', 'like', "%{$s}%");
            });
        }

        $limit = max(1, min((int) ($request->limit ?? 20), 100));
        $articles = $query->orderBy('created_at', 'desc')->take($limit)->get()->map(function ($a) {
            return [
                'id' => $a->id,
                'title' => $a->title,
                'category' => $a->category,
                'tags' => json_encode($a->tags ?? []),
                'views' => $a->views,
                'helpful_count' => $a->helpful_count,
                'author_name' => $a->author?->name,
                'created_at' => $a->created_at->toIso8601String(),
                'updated_at' => $a->updated_at->toIso8601String(),
            ];
        });

        $categories = KnowledgeArticle::where('status', 'published')
            ->distinct()
            ->pluck('category')
            ->values();

        return response()->json([
            'articles' => $articles,
            'categories' => $categories,
        ]);
    }

    public function show($id)
    {
        $article = KnowledgeArticle::with('author')->find($id);
        if (!$article) {
            return response()->json(['error' => 'Article not found'], 404);
        }

        $article->increment('views');

        return response()->json([
            'id' => $article->id,
            'title' => $article->title,
            'content' => $article->content,
            'category' => $article->category,
            'tags' => json_encode($article->tags ?? []),
            'status' => $article->status,
            'views' => $article->views,
            'helpful_count' => $article->helpful_count,
            'author_id' => $article->author_id,
            'author_name' => $article->author?->name,
            'created_at' => $article->created_at->toIso8601String(),
            'updated_at' => $article->updated_at->toIso8601String(),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager', 'agent'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'nullable|string|max:100',
            'tags' => 'nullable',
        ]);

        $tags = is_array($validated['tags'] ?? null) ? $validated['tags'] : [];

        $article = KnowledgeArticle::create([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'category' => $validated['category'] ?? 'general',
            'tags' => $tags,
            'status' => 'published',
            'author_id' => $user->id,
        ]);

        return response()->json($article, 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager', 'agent'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $article = KnowledgeArticle::find($id);
        if (!$article) {
            return response()->json(['error' => 'Article not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'category' => 'sometimes|string|max:100',
            'tags' => 'nullable',
        ]);

        if (isset($validated['tags']) && is_array($validated['tags'])) {
            $article->tags = $validated['tags'];
        }

        $article->update($validated);

        return response()->json($article);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager', 'agent'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $article = KnowledgeArticle::find($id);
        if (!$article) {
            return response()->json(['error' => 'Article not found'], 404);
        }

        $article->delete();
        return response()->json(['message' => 'Article deleted successfully']);
    }

    public function markHelpful($id)
    {
        $article = KnowledgeArticle::find($id);
        if ($article) {
            $article->increment('helpful_count');
        }

        return response()->json(['message' => 'Feedback saved successfully']);
    }
}
