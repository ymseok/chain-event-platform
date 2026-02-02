'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/common';
import { useApplication, useUpdateApplication, useDeleteApplication } from '@/lib/hooks';
import { useAppStore } from '@/lib/stores/app-store';

const updateApplicationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

type UpdateApplicationForm = z.infer<typeof updateApplicationSchema>;

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: app } = useApplication(appId);
  const updateMutation = useUpdateApplication();
  const deleteMutation = useDeleteApplication();
  const { setCurrentApp } = useAppStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateApplicationForm>({
    resolver: zodResolver(updateApplicationSchema),
    values: app
      ? {
          name: app.name,
          description: app.description || '',
        }
      : undefined,
  });

  const onSubmit = async (data: UpdateApplicationForm) => {
    try {
      const updated = await updateMutation.mutateAsync({
        id: appId,
        data: {
          name: data.name,
          description: data.description || undefined,
        },
      });
      setCurrentApp(updated);
      toast.success('Application updated');
    } catch (error) {
      toast.error('Failed to update application');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(appId);
      setCurrentApp(null);
      toast.success('Application deleted');
      router.push('/applications');
    } catch (error) {
      toast.error('Failed to delete application');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Update your application&apos;s basic information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete this application</p>
              <p className="text-sm text-muted-foreground">
                Once deleted, this application and all its data will be
                permanently removed.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              Delete Application
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Application"
        description={`Are you sure you want to delete "${app?.name}"? This action cannot be undone. All programs, webhooks, subscriptions, and logs will be permanently deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
