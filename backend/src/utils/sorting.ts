/**
 * Sorting algorithms for posts and comments
 */

/**
 * Wilson Score Confidence Interval for "Best" sorting
 * It balances upvotes with sample size - a comment with 1 upvote and 0 downvotes
 * won't rank higher than a comment with 100 upvotes and 10 downvotes
 *
 * @param upvotes Number of upvotes
 * @param downvotes Number of downvotes
 * @returns Wilson score (0-1, higher is better)
 */
export function wilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes;
  if (n === 0) return 0;

  // z = 1.96 for 95% confidence interval
  const z = 1.96;
  const p = upvotes / n;

  // Wilson score lower bound
  const left = p + (z * z) / (2 * n);
  const right = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  const under = 1 + (z * z) / n;

  return (left - right) / under;
}

/**
 * Hot score algorithm for posts
 * Uses logarithmic scoring with time decay
 *
 * @param upvotes Number of upvotes
 * @param downvotes Number of downvotes
 * @param createdAt Post creation timestamp
 * @returns Hot score (higher is hotter)
 */
export function hotScore(upvotes: number, downvotes: number, createdAt: Date): number {
  const score = upvotes - downvotes;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;

  // Epoch: Dec 8, 2005 (but we can use any fixed date)
  const epoch = new Date('2005-12-08T07:46:43Z').getTime();
  const seconds = (createdAt.getTime() - epoch) / 1000;

  // 45000 seconds = 12.5 hours, controls time decay rate
  return sign * order + seconds / 45000;
}

/**
 * Controversial score
 * Posts/comments with lots of votes but close to 50/50 split are most controversial
 *
 * @param upvotes Number of upvotes
 * @param downvotes Number of downvotes
 * @returns Controversy score (higher is more controversial)
 */
export function controversyScore(upvotes: number, downvotes: number): number {
  const total = upvotes + downvotes;
  if (total === 0) return 0;

  // Magnitude * balance factor
  // balance approaches 1 as votes approach 50/50, approaches 0 as one side dominates
  const magnitude = Math.pow(total, 0.8); // Slightly sublinear to not over-weight high-vote items
  const balance = Math.min(upvotes, downvotes) / Math.max(upvotes, downvotes, 1);

  return magnitude * balance;
}

/**
 * Rising score
 * Measures recent voting velocity - posts getting votes quickly
 *
 * @param upvotes Number of upvotes
 * @param downvotes Number of downvotes
 * @param createdAt Post creation timestamp
 * @returns Rising score (higher means rising faster)
 */
export function risingScore(upvotes: number, downvotes: number, createdAt: Date): number {
  const score = upvotes - downvotes;
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

  // Avoid division by zero, minimum age of 0.1 hours (6 minutes)
  const effectiveAge = Math.max(ageHours, 0.1);

  // Votes per hour, with a bonus for very new posts
  const velocity = score / effectiveAge;

  // Apply a recency bonus - newer posts get a multiplier
  // Decays to 1x over 24 hours
  const recencyBonus = Math.max(1, 2 - (ageHours / 24));

  return velocity * recencyBonus;
}

/**
 * Sort items by a scoring function
 * Generic helper to sort any array by a computed score
 */
export function sortByScore<T>(
  items: T[],
  scoreFn: (item: T) => number,
  descending: boolean = true
): T[] {
  return [...items].sort((a, b) => {
    const scoreA = scoreFn(a);
    const scoreB = scoreFn(b);
    return descending ? scoreB - scoreA : scoreA - scoreB;
  });
}

/**
 * Extract upvotes and downvotes from a vote list
 */
export function countVotes(voteValues: number[]): { upvotes: number; downvotes: number } {
  let upvotes = 0;
  let downvotes = 0;

  for (const value of voteValues) {
    if (value > 0) upvotes++;
    else if (value < 0) downvotes++;
  }

  return { upvotes, downvotes };
}
