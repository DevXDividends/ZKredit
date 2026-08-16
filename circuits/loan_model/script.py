import asyncio, ezkl

async def main():
    res = await ezkl.create_evm_verifier(
        vk_path='vk.key',
        settings_path='settings.json',
        sol_code_path='Verifier.sol',
        abi_path='Verifier.abi',
    )
    print('->', res)

asyncio.run(main())