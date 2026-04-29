import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'skillproof-ai';
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'email' },
            op: 'EQUAL',
            value: { stringValue: normalizedEmail },
          },
        },
        limit: 1,
      },
    };

    const firestoreRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody),
    });

    if (firestoreRes.ok) {
      const results = await firestoreRes.json();
      const hasDocument = results.some(r => r.document);

      if (hasDocument) {
        const doc = results.find(r => r.document);
        const role = doc.document.fields?.role?.stringValue || 'unknown';
        return NextResponse.json({ exists: true, role });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('check-email-exists error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
