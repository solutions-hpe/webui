# Add to simulation.conf [address] section
# webui_url=http://your-webui-server:3000

# Add after config parsing in simulation.sh
webui_url=$(get_value 'address' 'webui_url')

# Function to send status to webui
send_status() {
  local status_data=$1
  if [ -n "$webui_url" ]; then
    curl -X POST "$webui_url/api/simulations" \
         -H "Content-Type: application/json" \
         -d "$status_data" \
         --silent --output /dev/null
  fi
}

# Example usage: at the start of simulation
send_status "{
  \"id\": \"$simulation_id\",
  \"site\": \"$wsite\",
  \"status\": \"starting\",
  \"tests\": [\"$ping_test\", \"$download\", \"$iperf\", \"$dns_fail\"],
  \"currentTest\": \"initializing\"
}"

# During each test, update currentTest
# For example, before dns_fail:
if [ $dns_fail == "on" ]; then
  send_status "{
    \"id\": \"$simulation_id\",
    \"site\": \"$wsite\",
    \"status\": \"running\",
    \"currentTest\": \"dns_fail\"
  }"
  run_simulation "dns_fail.sh" 30
fi

# Similarly for others...

# At end of loop:
send_status "{
  \"id\": \"$simulation_id\",
  \"site\": \"$wsite\",
  \"status\": \"completed\",
  \"currentTest\": \"idle\"
}"