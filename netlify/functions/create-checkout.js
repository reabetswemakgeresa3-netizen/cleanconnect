// Netlify serverless function — creates a Yoco Checkout session
// Secret key lives here on the server, never exposed to the browser

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  try {
    const body = JSON.parse(event.body)
    const { amount, successUrl, cancelUrl, failureUrl, metadata } = body

    // Use env var if set, otherwise fall back to test key
    const secretKey = process.env.YOCO_SECRET_KEY || 'sk_test_960bfde0VBrLlpK098e4ffeb53e1'

    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(amount), // in cents, min 200 (R2)
        currency: 'ZAR',
        successUrl,
        cancelUrl,
        failureUrl,
        metadata: metadata || {}
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Yoco error:', data)
      return {
        statusCode: response.status,
        headers: CORS,
        body: JSON.stringify({ error: data.message || data.error || 'Yoco checkout failed' })
      }
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        checkoutId: data.id,
        redirectUrl: data.redirectUrl
      })
    }

  } catch (err) {
    console.error('Function error:', err)
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message || 'Server error' })
    }
  }
}
