Role Name
=========

Setup docker on a raspberry pi. The role installs all dependencies, docker, and adds the user to the docker group. Lastly, the role will login to the github container registry.


Example Playbook
----------------

Including an example of how to use your role (for instance, with variables passed in as parameters) is always nice for users too:

    - hosts: servers
      roles:
        - role: emrys_merlin.rpi.docker
          ghcr_username: "github user name"
          ghcr_password: "api_key"
