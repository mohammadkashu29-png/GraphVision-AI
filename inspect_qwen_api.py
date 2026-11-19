from gradio_client import Client
client = Client('https://nothingp-graphvision-qwen-htr.hf.space')
api = client.view_api()
print('--- API Description ---')
print(api)
