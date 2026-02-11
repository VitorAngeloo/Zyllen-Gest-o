module.exports = {
    apps: [
        {
            name: 'api',
            cwd: './apps/api',
            script: 'npm',
            args: 'run start:prod',
            env: {
                NODE_ENV: 'production',
            },
        },
        {
            name: 'web',
            cwd: './apps/web',
            script: 'npm',
            args: 'start',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
