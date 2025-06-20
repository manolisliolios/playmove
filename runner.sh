#!/bin/bash

URL="http://localhost:8181/build"

DATA='{
  "name":"temp",
  "sources":{
    "temp":"module temp::temp;\n\npublic fun foo(): bool {\n   true\n}\n\n#[test]\npublic fun run_test() {\n    foo();\n    std::debug::print(&b\"demo\".to_string())\n}"
  },
  "tests":{},
  "build_type":"Test"
}'

echo "Sending 500 parallel POST requests to $URL"

# Temporary file for storing durations
temp_file=$(mktemp)

for i in {1..500}
do
  {
    time_total=$(curl --location "$URL" \
      --header 'Content-Type: application/json' \
      --data "$DATA" \
      -s -w "%{time_total}" -o /dev/null)
    
    echo "Request #$i duration: $time_total seconds"
    
    # Append duration to temp file
    echo "$time_total" >> "$temp_file"
  } &
done

wait

# Calculate average from temp file
sum=0
count=0

while read -r duration; do
  sum=$(echo "$sum + $duration" | bc)
  ((count++))
done < "$temp_file"

if (( count > 0 )); then
  avg=$(echo "scale=3; $sum / $count" | bc)
  echo "Average request duration: $avg seconds"
else
  echo "No durations recorded!"
fi

# Clean up
rm "$temp_file"
