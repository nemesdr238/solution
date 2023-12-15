import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useActionData, useLoaderData, useNavigation } from '@remix-run/react';

import { Button } from '~/components/buttons';
import { Form, Input, Textarea } from '~/components/forms';
import { FloatingActionLink } from '~/components/links';
import { db } from '~/modules/db.server';

export async function deleteInvoice(request: Request, id: string): Promise<Response> {
  const referer = request.headers.get('referer');
  const redirectPath = referer || '/dashboard/income/';

  try {
    await db.invoice.delete({ where: { id } });
  } catch (error) {
    throw new Response('Not found', { status: 404 });
  }

  if (redirectPath.includes(id)) {
    return redirect('/dashboard/income/');
  }
  return redirect(redirectPath);
}

export async function updateInvoice(formData: FormData, id: string): Promise<Response> {
  const title = formData.get('title');
  const description = formData.get('description');
  const amount = formData.get('amount');
  if (typeof title !== 'string' || typeof description !== 'string' || typeof amount !== 'string') {
    throw Error('something went wrong');
  }
  const amountNumber = Number.parseFloat(amount);
  if (Number.isNaN(amountNumber)) {
    throw Error('something went wrong');
  }
  await db.invoice.update({
    where: { id },
    data: {
      title,
      description,
      amount: amountNumber,
    },
  });
  return json({ success: true });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) throw new Error('id route parameter is required');

  const formData = await request.formData();
  const intent = formData.get('intent');
  if (intent === 'delete') {
    return deleteInvoice(formData, id);
  }
  if (intent === 'update') {
    return updateInvoice(formData, id);
  }
  throw new Response('Bad request', { status: 400 });
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice) throw new Response('Not found', { status: 404 });
  return json(invoice);
}

export default function Component() {
  const invoice = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const isSubmitting = navigation.state !== 'idle' && navigation.formAction === `/dashboard/income/${invoice.id}`;

  return (
    <>
      <Form method="POST" action={`/dashboard/income/${invoice.id}`} key={invoice.id}>
        <Input label="Title:" type="text" name="title" defaultValue={invoice.id} required />
        <Textarea label="Description:" name="description" defaultValue={invoice.description || ''} />
        <Input label="Amount (in USD):" type="number" defaultValue={invoice.amount} name="amount" required />
        <Button type="submit" name="intent" value={'update'} isPrimary>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
        <p aria-live="polite" className="text-green-600">
          {actionData?.success && 'Changed saved!'}
        </p>
      </Form>

      <FloatingActionLink to="/dashboard/income/">Add invoice</FloatingActionLink>
    </>
  );
}
