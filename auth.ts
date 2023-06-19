import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import config from 'config';

const client = new SecretManagerServiceClient();

export async function getBotToken() {
    // Access the secret.
    const [accessResponse] = await client.accessSecretVersion({
        name: config.get("botTokenName"),
    });

    return accessResponse?.payload?.data?.toString();
}