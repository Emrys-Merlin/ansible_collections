Role Name
=========

Preliminary role to set up a raspberry pi as a headless server. It just runs some shell commands. As such the role indicates chaanges every run, which is sub-optimal. I might refine the role in the future.


Example Playbook
----------------

Including an example of how to use your role (for instance, with variables passed in as parameters) is always nice for users too:

    - hosts: servers
      roles:
        - role: emrys_merlin.rpi.headless
          headless_boot_behavior: "B1"  # Boot to CLI no autologin
          headless_boot_splash: 0  # Disable splash screen
