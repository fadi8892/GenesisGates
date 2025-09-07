'use client';

export default function SignOutButton() {
  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <button onClick={handleSignOut} className="hover:underline">
      Sign Out
    </button>
  );
}