/**
 * Test file for order number generation
 * Run with: npx tsx lib/__test_order_number_generator.ts
 * 
 * This test simulates the database queries to identify potential issues
 */

// Simulated order numbers that might exist in the database
const mockOrders = [
  { order_number: '12-01-01' },
  { order_number: '12-01-02' },
  { order_number: '15-01-03' },
  { order_number: '15-01-04' },
  { order_number: '20-01-05' },
  { order_number: '25-01-06' },
  { order_number: '25-01-07' },
  { order_number: '28-01-08' },
  { order_number: '28-01-09' },
  { order_number: '28-01-10' }, // Two digit sequential number
  { order_number: '05-02-01' }, // February orders start
  { order_number: '10-02-02' },
];

/**
 * Simulates the database query with ILIKE pattern matching
 */
function queryOrdersByPattern(pattern: string): typeof mockOrders {
  // Convert SQL ILIKE pattern to JavaScript regex
  // _ matches exactly one character
  // % matches any number of characters
  const regexPattern = pattern
    .replace(/_/g, '.') // SQL _ becomes regex . (any single char)
    .replace(/%/g, '.*'); // SQL % becomes regex .* (any chars)
  
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  
  return mockOrders.filter(order => regex.test(order.order_number));
}

/**
 * Simulates the FIXED order number generation logic
 */
function generateOrderNumber(deliveryDate: string): string {
  const [year, month, day] = deliveryDate.split('-');
  
  // Pattern to match all orders in this month
  const monthPattern = `__-${month}-%`;
  
  console.log(`\n🔍 Searching for pattern: "${monthPattern}"`);
  
  // Find matching orders
  const matchingOrders = queryOrdersByPattern(monthPattern);
  console.log(`   Found ${matchingOrders.length} matching orders:`, matchingOrders.map(o => o.order_number));
  
  let nextNum = 1;
  
  if (matchingOrders.length > 0) {
    // Extract all sequential numbers and find the maximum numerically
    const sequentialNumbers = matchingOrders
      .map(order => {
        if (!order.order_number) return 0;
        const parts = order.order_number.split('-');
        const num = parseInt(parts[2]);
        return isNaN(num) ? 0 : num;
      })
      .filter(num => num > 0);
    
    console.log(`   Extracted sequential numbers:`, sequentialNumbers);
    
    if (sequentialNumbers.length > 0) {
      const maxNum = Math.max(...sequentialNumbers);
      console.log(`   Maximum sequential number (numeric): ${maxNum}`);
      nextNum = maxNum + 1;
    }
  }
  
  const orderNumber = `${day}-${month}-${nextNum.toString().padStart(2, '0')}`;
  console.log(`   ✅ Generated order number: ${orderNumber}`);
  
  return orderNumber;
}

/**
 * Run test scenarios
 */
function runTests() {
  console.log('🧪 Testing Order Number Generation\n');
  console.log('📊 Mock Database Orders:');
  mockOrders.forEach(order => console.log(`   - ${order.order_number}`));
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: New order for January 31st (should be 11th order)');
  console.log('='.repeat(60));
  const result1 = generateOrderNumber('2026-01-31');
  console.log(`\n📌 Expected: 31-01-11`);
  console.log(`📌 Got:      ${result1}`);
  console.log(`   ${result1 === '31-01-11' ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: New order for February 15th (should be 3rd order)');
  console.log('='.repeat(60));
  const result2 = generateOrderNumber('2026-02-15');
  console.log(`\n📌 Expected: 15-02-03`);
  console.log(`📌 Got:      ${result2}`);
  console.log(`   ${result2 === '15-02-03' ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: First order of March (should be 01)');
  console.log('='.repeat(60));
  const result3 = generateOrderNumber('2026-03-10');
  console.log(`\n📌 Expected: 10-03-01`);
  console.log(`📌 Got:      ${result3}`);
  console.log(`   ${result3 === '10-03-01' ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('🐛 POTENTIAL ISSUE DEMONSTRATION');
  console.log('='.repeat(60));
  console.log('\nString sort vs Numeric sort comparison:');
  const testNumbers = ['28-01-08', '28-01-09', '28-01-10', '28-01-2', '28-01-20'];
  console.log('\nOriginal order:', testNumbers);
  console.log('String sort (descending):', [...testNumbers].sort((a, b) => b.localeCompare(a)));
  console.log('Expected for correct logic:', ['28-01-20', '28-01-10', '28-01-09', '28-01-08', '28-01-2']);
  
  console.log('\n⚠️  ISSUE: String sorting can cause problems when sequential numbers exceed 9!');
  console.log('   Example: "28-01-9" sorts AFTER "28-01-10" in descending string sort');
  console.log('   This means if you have orders 1-9 and then 10, the next order might be 10 again!');
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Simulating the string sort bug');
  console.log('='.repeat(60));
  
  // Add an order with single-digit sequential to demonstrate the bug
  const bugTestOrders = [
    { order_number: '30-01-08' },
    { order_number: '30-01-09' },
    { order_number: '30-01-10' },
    { order_number: '30-01-9' }, // This would come AFTER 10 in string sort!
  ];
  
  console.log('Orders:', bugTestOrders.map(o => o.order_number));
  const sorted = [...bugTestOrders].sort((a, b) => b.order_number.localeCompare(a.order_number));
  console.log('After descending sort:', sorted.map(o => o.order_number));
  console.log('⚠️  Notice "30-01-9" comes AFTER "30-01-10"!');
  
  const lastInBugTest = sorted[0];
  const extractedNum = parseInt(lastInBugTest.order_number.split('-')[2]);
  console.log(`\nExtracted number from "${lastInBugTest.order_number}": ${extractedNum}`);
  console.log(`Next number would be: ${extractedNum + 1}`);
  console.log(`\n❌ This is WRONG! Should be 11, but if "30-01-9" sorted first, it would be 10 (duplicate!)`);
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Bug scenario with FIXED logic');
  console.log('='.repeat(60));
  
  // Temporarily add problematic orders to test the fix
  mockOrders.push(
    { order_number: '30-04-08' },
    { order_number: '30-04-09' },
    { order_number: '30-04-10' },
    { order_number: '30-04-9' }, // Single digit - would break old logic!
  );
  
  const result4 = generateOrderNumber('2026-04-30');
  console.log(`\n📌 Expected: 30-04-11 (should find max of 10, not 9)`);
  console.log(`📌 Got:      ${result4}`);
  console.log(`   ${result4 === '30-04-11' ? '✅ PASS - Fix works!' : '❌ FAIL - Bug still present'}`);
}

// Run the tests
runTests();

console.log('\n\n' + '='.repeat(60));
console.log('✅ FIX APPLIED:');
console.log('='.repeat(60));
console.log(`
The fix:
1. Fetches ALL orders for the month (no string sorting)
2. Extracts and parses sequential numbers numerically
3. Finds the MAX using Math.max()
4. Increments by 1

This guarantees correct sequential numbering even with mixed 
single-digit and double-digit order numbers!
`);
