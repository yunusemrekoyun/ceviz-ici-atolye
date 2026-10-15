import { prisma } from '@/lib/prisma';
import { Card } from '@/components/admin/ui';
import { BlogPostEditor, NewBlogPostForm } from '@/components/admin/blog-editor';

export default async function AdminGuidePage() {
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div className="space-y-6">
      <Card title="Yeni Rehber Yazısı">
        <NewBlogPostForm />
      </Card>

      <Card title={`Rehber Yazıları (${posts.length})`}>
        {posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#4b5b47]">Henüz yazı yok.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <BlogPostEditor
                key={p.id}
                post={{
                  id: p.id,
                  title: p.title,
                  category: p.category,
                  body: p.body,
                  status: p.status,
                }}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
