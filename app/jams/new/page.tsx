import { redirect } from 'next/navigation'

export default function NewJamPage() {
  redirect('/jams?create=1')
}
