import { redirect } from 'next/navigation'

export default async function DMPage({
  params,
}: {
  params: Promise<{ dmId: string }> | { dmId: string }
}) {
  const { dmId } = await Promise.resolve(params)
  redirect(`/messages?dm=${dmId}`)
}
