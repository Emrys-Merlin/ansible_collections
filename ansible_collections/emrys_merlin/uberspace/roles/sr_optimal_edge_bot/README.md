Shadowrun Optimal Edge Bot
==========================

Launch a discord bot that can be useful for the RPG Shadowrun. You can find more details in [this blog post](https://timjadler.de/blog-posts/shadowrun-optimal-edge).

Caution! This role will store your bot's access token in plain text on the server. Please only proceed if that is okay for you.

Example Playbook
----------------

Including an example of how to use your role (for instance, with variables passed in as parameters) is always nice for users too:

    - hosts: servers
      roles:
        - role: emrys_merlin.uberspace.sr_optimal_edge_bot
          sr_service_file_location: ${HOME}/etc/services.d/sr_optimal_edge_bot.ini
          sr_executable_path: ${HOME}/bin/optimal_edge_bot
          sr_virtualenv_path: ${HOME}/virtualenvs/sr_optimal_edge_bot
          sr_pip_name: git+https://github.com/Emrys-Merlin/sr_optimal_edge_bot
          sr_executable: optimal_edge_bot
          sr_discord_token: "Retrieve from vault"
