Role Name
=========

This role sets up a service that regularly checks a website for updates and then pushes a notification to telegram, if an update was found. The role copies a launcher script for a docker image and sets up a cronjob to regularly start the launcher.

Caution! This role will store your telegram bot API access token in clear text on the runner. Use this role only if you are okay with this.

Requirements
------------

This role depends on a built docker image and assumes that the runner has access to the registry to retrieve it.

Example Playbook
----------------

Including an example of how to use your role (for instance, with variables passed in as parameters) is always nice for users too:

    - hosts: servers
      roles:
        - role: web_watchr
          telegram_token: "token for the telegram chat bot to send messages"
          telegram_chat_id: "chat id of the telegram channel to post in"
