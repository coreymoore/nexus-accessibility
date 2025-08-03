const { Protocol } = require('devtools-protocol');

const devtools = async () => {
    const client = await Protocol.connect();

    // Enable the Accessibility domain
    await client.send('Accessibility.enable');

    // Fetch the Accessibility Tree
    const { nodes } = await client.send('Accessibility.getFullAXTree');

    // Process and display the Accessibility Tree
    console.log(nodes);

    // Add any additional UI integration or hooks here
};

devtools().catch(console.error);