#!/bin/bash
# Convert mockXxx.mockResolvedValueOnce to responseQueue.push in 7 test files
# (circleService already fixed)

FILES=(
  "tests/unit/dailyBitesService.test.ts"
  "tests/unit/earningsService.test.ts"
  "tests/unit/friendService.test.ts"
  "tests/unit/peerReviewService.test.ts"
  "tests/unit/errorJailService.test.ts"
  "tests/unit/featureFlagService.test.ts"
  "tests/unit/leaderboardService.test.ts"
)

for f in "${FILES[@]}"; do
  echo "Processing $f..."
  sed -i \
    -e 's/mockInsert\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockSingle\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockMaybeSingle\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockSelect\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockUpdate\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockDelete\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockIn\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockOr\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockRpc\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockRange\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockUpsert\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockMatch\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockOrder\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockEq\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockNot\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockGte\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockLte\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockIs\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockNeq\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockLt\.mockResolvedValueOnce(/responseQueue.push(/g' \
    -e 's/mockLimit\.mockResolvedValueOnce(/responseQueue.push(/g' \
    "$f"
done

echo "Done! All mockXxx.mockResolvedValueOnce -> responseQueue.push conversions applied."
