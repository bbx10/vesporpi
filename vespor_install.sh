#!/bin/bash
#
#Prereq
#Pi3 running Raspbian May 10, 2016 or newer
#Login to command line shell via ssh, UART console port, or keyboard/monitor.
#Set up network: Ethernet or WiFi
#Use raspi-config to expand file system, enable i2c,
#  change hostname to vesporpi3,
#  change password
#  change timezone
#
sudo apt-get update
sudo apt-get upgrade
# Install nodejs 4.x
# Reference: https://github.com/nodesource/distributions
curl -sL https://deb.nodesource.com/setup_4.x | sudo bash -
sudo apt-get install -y nodejs
# Install mjpg-streamer video package
sudo apt-get install -y build-essential subversion libjpeg62-turbo-dev
sudo apt-get install -y imagemagick libv4l-0 libv4l-dev uvcdynctrl screen git
cd
git clone http://github.com/bbx10/mjpg-streamer.git
cd mjpg-streamer/mjpg-streamer
make USE_LIBV4L2=true clean all
#
# Install vesporpi package and dependencies
cd
git clone http://github.com/bbx10/vesporpi
cd vesporpi
npm install
# Install WiFi Access Point
# Reference: https://frillip.com/using-your-raspberry-pi-3-as-a-wifi-access-point-with-hostapd/
sudo apt-get -y install dnsmasq hostapd
if ! grep -q "^denyinterfaces wlan0" /etc/dhcpcd.conf
then
  sudo echo "denyinterfaces wlan0" >>/etc/dhcpcd.conf
fi
# Change wlan0 interface to static IP
sudo sed -i.bak -f - <<EOF /etc/network/interfaces
/^iface wlan0 inet manual/{
i\\
iface wlan0 inet static\\
    address 192.168.99.1\\
    netmask 255.255.255.0\\
    network 192.168.99.0\\
    broadcast 192.168.99.255\\

}
/^iface wlan0 inet manual/,/^$/d
EOF
sudo service dhcpcd restart
sudo ifdown wlan0
sudo ifup wlan0
if [ -f /etc/hostapd/hostapd.conf ]
then
    sudo cp /etc/hostapd/hostapd.conf /etc/hostapd/hostapd.conf.orig
fi
cat <<EOF >/tmp/hostapd.conf.$$
# This is the name of the WiFi interface we configured above
interface=wlan0

# Use the nl80211 driver with the brcmfmac driver
driver=nl80211

# This is the name of the network
ssid=vesporpi3

# Use the 2.4GHz band
hw_mode=g

# Use channel 6
channel=6

# Enable 802.11n
ieee80211n=1

# Enable WMM
wmm_enabled=1

# Enable 40MHz channels with 20ns guard interval
ht_capab=[HT40][SHORT-GI-20][DSSS_CCK-40]

# Accept all MAC addresses
macaddr_acl=0

# Use WPA authentication
auth_algs=1

# Require clients to know the network name
ignore_broadcast_ssid=0

# Use WPA2
wpa=2

# Use a pre-shared key
wpa_key_mgmt=WPA-PSK

# The network passphrase.
# *** CHANGE THIS ***
wpa_passphrase=raspberry

# Use AES, instead of TKIP
rsn_pairwise=CCMP
EOF
sudo mv /tmp/hostapd.conf.$$ /etc/hostapd/hostapd.conf
sudo chown root:root /etc/hostapd/hostapd.conf
sudo chmod go-rwx /etc/hostapd/hostapd.conf
sudo sed -i.bak 's,#DAEMON_CONF="",DAEMON_CONF="/etc/hostapd/hostapd.conf",' /etc/default/hostapd 
#
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.orig
cat <<EOF >/tmp/dnsmasq.conf.$$
interface=wlan0      # Use interface wlan0
listen-address=192.168.99.1 # Explicitly specify the address to listen on
bind-interfaces      # Bind to the interface to make sure we aren't sending things elsewhere
server=8.8.8.8       # Forward DNS requests to Google DNS
domain-needed        # Don't forward short names
bogus-priv           # Never forward addresses in the non-routed address spaces.
dhcp-range=192.168.99.100,192.168.99.199,12h # Assign IP addresses with a 12 hour lease time
EOF
sudo mv /tmp/dnsmasq.conf.$$ /etc/dnsmasq.conf
sudo chown root:root /etc/hostapd/hostapd.conf
sudo chmod go-rwx /etc/hostapd/hostapd.conf
# Enable IP v4 forwarding
if ! grep -q "^net.ipv4.ip_forward=1" /etc/sysctl.conf
then
    sudo sed -i.bak 's/^#net.ipv4.ip_forward=1$/net.ipv4.ip_forward=1/' /etc/sysctl.conf
fi
sudo sh -c "echo 1 > /proc/sys/net/ipv4/ip_forward"
# Enable NAT
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT
sudo sh -c "iptables-save > /etc/iptables.ipv4.nat"
# Add iptables-restore < /etc/iptables.ipv4.nat before exit 0
sudo sed -i.bak \
    -e '/^iptables-restore < \/etc\/iptables.ipv4.nat/d' \
    -e '/^exit 0/i\' \
    -e 'iptables-restore < \/etc\/iptables.ipv4.nat' /etc/rc.local 
sudo service hostapd start
sudo service dnsmasq start
cd ~/vesporpi
./vespor_start.sh
# add auto start to crontab
if ! crontab -l 2>/dev/null | grep -q "^@reboot.*vespor_start.sh"
then
  ( crontab -l 2>/dev/null;\
    echo '@reboot         ~/vesporpi/vespor_start.sh' ) | crontab -
fi
#
echo ""
echo "Connect to WiFi AP name (SSID) vesporpi3 with password in this script."
echo "Connect Chrome/Chromium to http://192.168.99.1 for the cockpit view"
echo "Press F11 to toggle full screen."
echo "Adjust the camera frame size and frame rate for smooth streaming."
echo "Laptops/PCs can keep up but tablets/phones lag at high frame sizes and rates."
