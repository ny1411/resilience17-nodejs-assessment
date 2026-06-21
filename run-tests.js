const axios = require('axios');

const baseUrl = process.env.TARGET_URL || 'https://resilience17-nodejs-assessment.onrender.com';
const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: () => true,
});

const run = async () => {
  // Generate random IDs so tests are idempotent and independent across runs
  const testId = Date.now();
  const creatorRef1 =
    Math.random().toString(36).substring(2, 12) + testId.toString().substring(3, 13); // exactly 20 chars

  const publicSlug = `public-slug-${testId}`;
  const privateSlug = `private-slug-${testId}`;
  const draftSlug = `draft-slug-${testId}`;

  let passed = 0;
  let failed = 0;
  const results = [];

  const assert = (name, condition, details = '') => {
    if (condition) {
      passed++;
      console.log(`\x1b[32m[PASS]\x1b[0m ${name}`);
      results.push({ name, passed: true });
    } else {
      failed++;
      console.log(`\x1b[31m[FAIL]\x1b[0m ${name}`);
      if (details) console.log(`       Reason: ${details}`);
      results.push({ name, passed: false, reason: details });
    }
  };

  console.log(`Starting Integration Tests against: ${baseUrl}\n`);

  // TC1: Execute full card creation and verify HTTP 200 and data mapping
  {
    const payload = {
      title: `TC1 Title ${testId}`,
      description: 'TC1 Description',
      slug: publicSlug,
      creator_reference: creatorRef1,
      status: 'published',
      access_type: 'public',
      links: [{ title: 'My Website', url: 'https://example.com' }],
      service_rates: {
        currency: 'USD',
        rates: [{ name: 'Consulting', amount: 100, description: '1 hour session' }],
      },
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC1 - Execute full card creation and verify HTTP 200 and data mapping',
      res.status === 200 &&
        res.data?.status === 'success' &&
        res.data?.data?.id &&
        res.data?.data?._id === undefined &&
        res.data?.data?.slug === publicSlug,
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC2: Verify slug auto-generation from title (HTTP 200)
  let generatedSlug = '';
  {
    const payload = {
      title: `Auto Gen ${testId}`, // Should generate auto-gen-<testId>
      description: 'Auto Gen Description',
      creator_reference: creatorRef1,
      status: 'published',
      access_type: 'public',
    };
    const res = await api.post('/creator-cards', payload);
    const expectedSlug = `auto-gen-${testId}`;
    const actualSlug = res.data?.data?.slug;
    generatedSlug = actualSlug;
    assert(
      'TC2 - Verify slug auto-generation from title (HTTP 200)',
      res.status === 200 &&
        res.data?.status === 'success' &&
        actualSlug &&
        actualSlug.startsWith(expectedSlug),
      `Status: ${res.status}, Expected starts with: ${expectedSlug}, Actual: ${actualSlug}`
    );
  }

  // TC3: Create a private card and verify the access_code is returned (HTTP 200)
  {
    const payload = {
      title: `Private Card ${testId}`,
      description: 'Private card description',
      slug: privateSlug,
      creator_reference: creatorRef1,
      status: 'published',
      access_type: 'private',
      access_code: '123456',
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC3 - Create a private card and verify the access_code is returned (HTTP 200)',
      res.status === 200 &&
        res.data?.status === 'success' &&
        res.data?.data?.access_code === '123456',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC4: Retrieve a public, published card successfully (HTTP 200)
  {
    const res = await api.get(`/creator-cards/${publicSlug}`);
    assert(
      'TC4 - Retrieve a public, published card successfully (HTTP 200)',
      res.status === 200 &&
        res.data?.status === 'success' &&
        res.data?.data?.slug === publicSlug &&
        res.data?.data?.access_code === undefined,
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC5: Retrieve a private card with the correct pin (HTTP 200)
  {
    const res = await api.get(`/creator-cards/${privateSlug}?access_code=123456`);
    assert(
      'TC5 - Retrieve a private card with the correct pin (HTTP 200)',
      res.status === 200 &&
        res.data?.status === 'success' &&
        res.data?.data?.slug === privateSlug &&
        res.data?.data?.access_code === undefined,
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC7: Create a card with a duplicate slug (Expect HTTP 400, SL02)
  {
    const payload = {
      title: `Duplicate Card ${testId}`,
      slug: publicSlug, // already exists
      creator_reference: creatorRef1,
      status: 'published',
      access_type: 'public',
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC7 - Create a card with a duplicate slug (Expect HTTP 400, SL02)',
      res.status === 400 && res.data?.status === 'error' && res.data?.error_code === 'SL02',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC8: Create a private card missing the access_code (Expect HTTP 400, AC01)
  {
    const payload = {
      title: `Private Missing Code ${testId}`,
      creator_reference: creatorRef1,
      status: 'published',
      access_type: 'private',
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC8 - Create a private card missing the access_code (Expect HTTP 400, AC01)',
      res.status === 400 && res.data?.status === 'error' && res.data?.error_code === 'AC01',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC9: Create a public card with an access_code (Expect HTTP 400, AC05)
  {
    const payload = {
      title: `Public With Code ${testId}`,
      creator_reference: creatorRef1,
      status: 'published',
      access_type: 'public',
      access_code: '123456',
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC9 - Create a public card with an access_code (Expect HTTP 400, AC05)',
      res.status === 400 && res.data?.status === 'error' && res.data?.error_code === 'AC05',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC10: Trigger a framework validation failure, e.g., invalid status (Expect HTTP 400)
  {
    const payload = {
      title: `Invalid Status ${testId}`,
      creator_reference: creatorRef1,
      status: 'invalid_status',
      access_type: 'public',
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC10 - Trigger a framework validation failure, e.g., invalid status (Expect HTTP 400)',
      res.status === 400 && res.data?.status === 'error',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC11: Attempt to retrieve a non-existent card (Expect HTTP 404, NF01)
  {
    const res = await api.get(`/creator-cards/non-existent-${testId}`);
    assert(
      'TC11 - Attempt to retrieve a non-existent card (Expect HTTP 404, NF01)',
      res.status === 404 && res.data?.status === 'error' && res.data?.error_code === 'NF01',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC12: Attempt to retrieve a draft card (Expect HTTP 404, NF02)
  {
    const payload = {
      title: `Draft Card Title ${testId}`,
      slug: draftSlug,
      creator_reference: creatorRef1,
      status: 'draft',
      access_type: 'public',
    };
    const createRes = await api.post('/creator-cards', payload);
    const getRes = await api.get(`/creator-cards/${draftSlug}`);
    assert(
      'TC12 - Attempt to retrieve a draft card (Expect HTTP 404, NF02)',
      getRes.status === 404 &&
        getRes.data?.status === 'error' &&
        getRes.data?.error_code === 'NF02',
      `Create Status: ${createRes.status}, Get Status: ${getRes.status}, Body: ${JSON.stringify(getRes.data)}`
    );
  }

  // TC13: Attempt to retrieve a private card without a pin (Expect HTTP 403, AC03)
  {
    const res = await api.get(`/creator-cards/${privateSlug}`);
    assert(
      'TC13 - Attempt to retrieve a private card without a pin (Expect HTTP 403, AC03)',
      res.status === 403 && res.data?.status === 'error' && res.data?.error_code === 'AC03',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC14: Attempt to retrieve a private card with a wrong pin (Expect HTTP 403, AC04)
  {
    const res = await api.get(`/creator-cards/${privateSlug}?access_code=wrongpin`);
    assert(
      'TC14 - Attempt to retrieve a private card with a wrong pin (Expect HTTP 403, AC04)',
      res.status === 403 && res.data?.status === 'error' && res.data?.error_code === 'AC04',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC15: Attempt to delete a non-existent card (Expect HTTP 404, NF01)
  {
    const payload = { creator_reference: creatorRef1 };
    const res = await api.delete(`/creator-cards/non-existent-${testId}`, { data: payload });
    assert(
      'TC15 - Attempt to delete a non-existent card (Expect HTTP 404, NF01)',
      res.status === 404 && res.data?.status === 'error' && res.data?.error_code === 'NF01',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC6: Delete a card and verify the response structure (HTTP 200)
  {
    const payload = { creator_reference: creatorRef1 };
    const res = await api.delete(`/creator-cards/${publicSlug}`, { data: payload });
    assert(
      'TC6 - Delete a card and verify the response structure (HTTP 200)',
      res.status === 200 &&
        res.data?.status === 'success' &&
        res.data?.data?.slug === publicSlug &&
        res.data?.data?.deleted !== null,
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC16: Attempt to retrieve a previously deleted card (Expect HTTP 404, NF01)
  {
    const res = await api.get(`/creator-cards/${publicSlug}`);
    assert(
      'TC16 - Attempt to retrieve a previously deleted card (Expect HTTP 404, NF01)',
      res.status === 404 && res.data?.status === 'error' && res.data?.error_code === 'NF01',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // --- ADDITIONAL EDGE CASE TESTS ---

  // TC17: Title too short (Expect HTTP 400)
  {
    const payload = {
      title: 'Ab', // < 3 chars
      creator_reference: creatorRef1,
      status: 'published',
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC17 - Create card with title too short (Expect HTTP 400)',
      res.status === 400 && res.data?.status === 'error',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC18: Invalid creator_reference length (Expect HTTP 400)
  {
    const payload = {
      title: 'Valid Title',
      creator_reference: 'short', // < 20 chars
      status: 'published',
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC18 - Create card with invalid creator_reference length (Expect HTTP 400)',
      res.status === 400 && res.data?.status === 'error',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC19: Invalid URL format in links (Expect HTTP 400)
  {
    const payload = {
      title: 'Valid Title',
      creator_reference: creatorRef1,
      status: 'published',
      links: [{ title: 'Bad Link', url: 'ftp://bad.com' }], // must start with http/https
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC19 - Create card with invalid link URL format (Expect HTTP 400)',
      res.status === 400 && res.data?.status === 'error',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC20: Missing required fields (Expect HTTP 400)
  {
    const payload = {
      description: 'Missing title, creator_reference, and status',
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC20 - Create card missing required fields (Expect HTTP 400)',
      res.status === 400 && res.data?.status === 'error',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC21: Invalid currency in service_rates (Expect HTTP 400)
  {
    const payload = {
      title: 'Valid Title',
      creator_reference: creatorRef1,
      status: 'published',
      service_rates: {
        currency: 'EUR', // Not in enum
        rates: [{ name: 'Rate', amount: 100 }],
      },
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC21 - Create card with invalid currency (Expect HTTP 400)',
      res.status === 400 && res.data?.status === 'error',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC22: Empty rates array (Expect HTTP 400)
  {
    const payload = {
      title: 'Valid Title',
      creator_reference: creatorRef1,
      status: 'published',
      service_rates: {
        currency: 'USD',
        rates: [], // Empty array
      },
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC22 - Create card with empty rates array (Expect HTTP 400)',
      res.status === 400 && res.data?.status === 'error',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC23: Negative or zero amount in rates (Expect HTTP 400)
  {
    const payload = {
      title: 'Valid Title',
      creator_reference: creatorRef1,
      status: 'published',
      service_rates: {
        currency: 'USD',
        rates: [{ name: 'Rate', amount: 0 }], // Zero is invalid
      },
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC23 - Create card with zero amount (Expect HTTP 400)',
      res.status === 400 && res.data?.status === 'error',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC24: Invalid access_code format (Expect HTTP 400)
  {
    const payload = {
      title: 'Valid Title',
      creator_reference: creatorRef1,
      status: 'published',
      access_type: 'private',
      access_code: '12345', // 5 chars instead of 6
    };
    const res = await api.post('/creator-cards', payload);
    assert(
      'TC24 - Create card with invalid access_code format (Expect HTTP 400)',
      res.status === 400 && res.data?.status === 'error',
      `Status: ${res.status}, Body: ${JSON.stringify(res.data)}`
    );
  }

  // TC25: Auto-generated slug collision handling (HTTP 200)
  let collisionSlug1 = '';
  let collisionSlug2 = '';
  {
    const duplicateTitle = `Collision Test ${testId}`;
    const payload = {
      title: duplicateTitle,
      creator_reference: creatorRef1,
      status: 'published',
    };
    const res1 = await api.post('/creator-cards', payload);
    const res2 = await api.post('/creator-cards', payload);

    collisionSlug1 = res1.data?.data?.slug;
    collisionSlug2 = res2.data?.data?.slug;

    assert(
      'TC25 - Auto-generated slug collision handling (HTTP 200)',
      res1.status === 200 &&
        res2.status === 200 &&
        collisionSlug1 &&
        collisionSlug2 &&
        collisionSlug1 !== collisionSlug2 &&
        collisionSlug2.startsWith('collision-test-'),
      `Slugs: ${collisionSlug1}, ${collisionSlug2}`
    );
  }

  // Cleanup other created cards
  try {
    await api.delete(`/creator-cards/${privateSlug}`, { data: { creator_reference: creatorRef1 } });
    await api.delete(`/creator-cards/${draftSlug}`, { data: { creator_reference: creatorRef1 } });
    if (generatedSlug) {
      await api.delete(`/creator-cards/${generatedSlug}`, {
        data: { creator_reference: creatorRef1 },
      });
    }
    if (collisionSlug1) {
      await api.delete(`/creator-cards/${collisionSlug1}`, {
        data: { creator_reference: creatorRef1 },
      });
    }
    if (collisionSlug2) {
      await api.delete(`/creator-cards/${collisionSlug2}`, {
        data: { creator_reference: creatorRef1 },
      });
    }
  } catch (e) {
    // Ignore cleanup errors
  }

  console.log(`\n--- Test Execution Summary ---`);
  console.log(`Total: ${passed + failed}`);
  console.log(`Passed: \x1b[32m${passed}\x1b[0m`);
  console.log(`Failed: \x1b[31m${failed}\x1b[0m`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

run().catch((err) => {
  console.error('Unhandled error running integration tests:', err);
  process.exit(1);
});
