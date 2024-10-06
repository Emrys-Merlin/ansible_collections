Watchdog
=========

Minimal example to start a watchdog on a raspberry pi (4) that checks if an ip address is reachable.

Example Playbook
----------------


    - hosts: servers
      roles:
        - role: emrys-merlin.rpi.watchdog
          watchdog_ping_ip_address: 8.8.8.8
