import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get('barcode');

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode required' }, { status: 400 });
  }

  try {
    // Attempt lookup from UPCitemdb trial API
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (data.code === 'OK' && data.items && data.items.length > 0) {
      const item = data.items[0];
      
      // Return normalized payload
      return NextResponse.json({
        found: true,
        data: {
          name: item.title,
          description: item.description || '',
          brand: item.brand || '',
          category: item.category || '',
          imageUrl: item.images && item.images.length > 0 ? item.images[0] : null,
          barcode: barcode
        }
      });
    }

    return NextResponse.json({ found: false, message: 'Product not found in registry.' });
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
