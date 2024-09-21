Role Name
=========

Setup a USB hdd connected to a raspberry pi. This will create a new partition, encrypt it using `cryptsetup`, format the encrypted partition using `ext4`, mount it and symlink it to an additional location (if desired).

Role Variables
--------------

- hdd_disk: /dev/sda - Disk to use
- hdd_device_nr: 1 - Which partition to create and use
- hdd_container: vault - Defines mount points and similar
- hdd_disk_encryption_password: "" - Password for disk encryption. Please save this in a vault or another secure location.

Example Playbook
----------------

Including an example of how to use your role (for instance, with variables passed in as parameters) is always nice for users too:

    - hosts: servers
      roles:
        - role: pi_with_hdd
          hdd_disk_encryption_password: "get from vault or other safe storage"
          hdd_disk: /dev/sda
          hdd_device_nr: 1
          hdd_container: vault
