# utility_functions.sh
# @knighttower - https://github.com/knighttower

# This function retrieves the value of a given environment variable from the .env file.
function getEnv() {
    local var=$1

    if [[ -z "$var" ]]; then
        echo "Error: No variable name specified."
        exit 1
    fi

    VAR=$(grep -w "$var" "$rootDir/.env" | head -1)
    IFS="=" read -ra VAR <<<"$VAR"
    envVar="${VAR[1]}"

    envVar=${envVar%$'\n'}   # Remove a trailing newline.
    envVar=${envVar//$'\n'/} # Remove all newlines.
    echo ${envVar} | tr -d '\040\011\012\015'
}

function testDockerRunning() {
    if docker info >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# This function prompts the user for a yes/no confirmation.
function promptConfirmation() {
    local message=$1
    while true; do
        read -p $'\e[33m'"${message}"$'\e[0m :: (Y/N or Enter to skip) : ' response
        case $response in
        [Yy]*) return 0 ;;
        [Nn]* | "") return 1 ;;
        *) echo "Please answer yes or no." ;;
        esac
    done
}
