import { redirect } from 'next/navigation'

interface EditJamRedirectPageProps {
  params: { id: string }
}

export default function EditJamRedirectPage({ params }: EditJamRedirectPageProps) {
  redirect(`/jams/${params.id}?edit=1`)
}
