import secrets
import string


def generate_rma_code(length: int = 10) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "RMA-" + "".join(secrets.choice(alphabet) for _ in range(length))
